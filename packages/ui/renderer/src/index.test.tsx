// @vitest-environment jsdom

import { Context } from '@deepseek-ai/cordis';
import { apply as applyI18n } from '@yunzhen/cordis-ui-i18n';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { useTranslation } from 'react-i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { apply, inject, Slot, SlotOwner } from './index';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const Null = () => null;

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, 'languages', { configurable: true, value: ['zh-CN'] });
});

async function bootRenderer() {
  const ctx = new Context();
  const i18nFiber = ctx.plugin({ apply: applyI18n });
  await i18nFiber.await();
  const fiber = ctx.plugin({ apply, inject });
  await fiber.await();
  return {
    ctx,
    async dispose() {
      await fiber.dispose();
      await i18nFiber.dispose();
    },
  };
}

describe('ui renderer', () => {
  it('removes a contribution when its caller fiber is disposed', async () => {
    const { ctx, dispose } = await bootRenderer();
    ctx.slots.register({ name: 'root', children: { host: { kind: 'single', scope: 'root' } } }, Null);
    const fiber = ctx.plugin({
      inject: ['slots'],
      apply(pluginCtx) {
        pluginCtx.slots.register({ name: 'host' }, Null);
      },
    });

    await fiber.await();
    await fiber.dispose();

    expect(ctx.slots.entries('host')).toEqual([]);
    await dispose();
  });

  it('stops an injection after its callback throws', async () => {
    const { ctx, dispose } = await bootRenderer();
    let runs = 0;
    const disposeRoot = ctx.slots.register({ name: 'root', children: { host: { kind: 'single', scope: 'root' } } }, Null);

    expect(() => ctx.slots.inject('host', () => {
      runs += 1;
      throw new Error('broken');
    })).toThrow('broken');
    disposeRoot();
    ctx.slots.register({ name: 'root', children: { host: { kind: 'single', scope: 'root' } } }, Null);

    expect(runs).toBe(1);
    await dispose();
  });

  it('stops an injection quietly when caller teardown replaces its declaration', async () => {
    const { ctx, dispose } = await bootRenderer();
    const removeDeclaration = ctx.slots.register({
      name: 'root',
      children: { host: { kind: 'single', scope: 'root' } },
    }, Null);
    let removeReplacement = () => {};
    let runs = 0;
    const caller = ctx.plugin({
      inject: ['slots'],
      apply(pluginCtx) {
        pluginCtx.slots.inject('host', () => {
          runs += 1;
          return () => {
            removeDeclaration();
            removeReplacement = ctx.slots.register({
              name: 'root',
              children: { host: { kind: 'single', scope: 'root' } },
            }, Null);
          };
        });
      },
    });
    await caller.await();

    await caller.dispose();
    await new Promise<void>(resolve => queueMicrotask(resolve));

    expect(runs).toBe(1);
    removeReplacement();
    await dispose();
  });

  it('mounts only the root Slot and renders declared descendants', async () => {
    const { ctx, dispose } = await bootRenderer();
    const Frame = () => <main><Slot name="host" /></main>;
    const Host = () => <h1>Settings</h1>;
    ctx.slots.register({ name: 'root', children: { host: { kind: 'single', scope: 'root' } } }, Frame);
    ctx.slots.register({ name: 'host' }, Host);
    const container = document.createElement('div');

    let unmount!: () => void;
    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    expect(container.innerHTML).toBe('<main><h1>Settings</h1></main>');
    await act(async () => unmount());
    await dispose();
  });

  it('refreshes slot content when the active language changes', async () => {
    const { ctx, dispose } = await bootRenderer();
    const Greeting = () => {
      const { t } = useTranslation();
      return <h1>{t('greeting')}</h1>;
    };
    ctx.i18n.register({
      'zh-CN': { greeting: '你好' },
      'en-US': { greeting: 'Hello' },
    });
    ctx.slots.register({ name: 'root' }, Greeting);
    const container = document.createElement('div');

    let unmount!: () => void;
    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });
    expect(container.textContent).toBe('你好');

    await act(async () => ctx.i18n.setLocale('en-US'));
    expect(container.textContent).toBe('Hello');

    await act(async () => unmount());
    await dispose();
  });

  it('provides a disposable owner for route-declared slots', async () => {
    const { ctx, dispose } = await bootRenderer();
    const owner = ctx.slots.createOwner('settings', {
      'settings.section': { kind: 'list', scope: 'root' },
    });
    ctx.slots.register({ name: 'settings.section', id: 'appearance' }, () => <>Appearance</>);

    expect(renderToStaticMarkup(
      <SlotOwner owner={owner}>
        <Slot name="settings.section" />
      </SlotOwner>,
    )).toBe('Appearance');

    owner.dispose();

    expect(ctx.slots.spec('settings.section')).toBeUndefined();
    expect(ctx.slots.entries('settings.section')).toEqual([]);
    await dispose();
  });

  it('clears a mounted route slot when its owner is disposed', async () => {
    const { ctx, dispose } = await bootRenderer();
    const owner = ctx.slots.createOwner('settings', {
      'settings.section': { kind: 'single', scope: 'root' },
    });
    ctx.slots.register({ name: 'settings.section' }, () => <>Appearance</>);
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SlotOwner owner={owner}>
          <Slot name="settings.section" />
        </SlotOwner>,
      );
    });
    expect(container.textContent).toBe('Appearance');

    await act(async () => owner.dispose());

    expect(container.textContent).toBe('');
    await act(async () => root.unmount());
    await dispose();
  });

  it('throws outside an owner and for a child the owner did not declare', async () => {
    const { ctx, dispose } = await bootRenderer();
    const owner = ctx.slots.createOwner('settings', {});

    expect(() => renderToStaticMarkup(<Slot name="missing" />)).toThrow('without an owner');
    expect(() => renderToStaticMarkup(
      <SlotOwner owner={owner}>
        <Slot name="missing" />
      </SlotOwner>,
    )).toThrow('not declared by owner "settings"');

    owner.dispose();
    await dispose();
  });
});
