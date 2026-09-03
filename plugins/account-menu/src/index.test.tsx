// @vitest-environment jsdom

import type { Context as CordisContext } from '@deepseek-ai/cordis';
import { Context } from '@deepseek-ai/cordis';
import { apply as applyI18n } from '@yunzhen/cordis-ui-i18n';
import { apply as applyRenderer, inject as rendererInject } from '@yunzhen/cordis-ui-renderer';
import { apply as applyRouter, inject as routerInject } from '@yunzhen/cordis-ui-router';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apply as applyAppLayout } from '../../app-layout/src';
import { apply as applySettingsLayout } from '../../settings-layout/src';
import { apply } from './index';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  Object.defineProperty(navigator, 'languages', { configurable: true, value: ['en-US'] });
});

afterEach(() => {
  document.body.querySelector('[data-account-menu]')?.parentElement?.remove();
});

async function boot() {
  const ctx = new Context();
  const fibers: ReturnType<CordisContext['plugin']>[] = [];
  for (const module of [
    { apply: applyI18n },
    { apply: applyRenderer, inject: rendererInject },
    { apply: applyRouter, inject: routerInject },
    { apply: applyAppLayout, inject: ['slots', 'routes'] },
    { apply: applySettingsLayout, inject: ['i18n', 'routes'] },
    { apply, inject: ['i18n', 'slots'] },
  ]) {
    const fiber = ctx.plugin(module);
    fibers.push(fiber);
    await fiber.await();
  }
  ctx.routes.register({ id: 'home', parentId: 'app-layout', index: true, Component: () => null });

  return {
    ctx,
    container: document.createElement('div'),
    async dispose() {
      for (const fiber of fibers.reverse()) await fiber.dispose();
    },
  };
}

describe('account menu', () => {
  it('opens from the sidebar footer and navigates to Settings', async () => {
    const { container, ctx, dispose } = await boot();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    const trigger = container.querySelector<HTMLButtonElement>('[data-account-menu-trigger]')!;
    expect(trigger).not.toBeNull();
    await act(async () => trigger.click());
    const menu = document.body.querySelector('[data-account-menu]')!;
    expect(menu.textContent).toContain('Settings');

    const settings = menu.querySelector<HTMLAnchorElement>('a[href="/settings"]')!;
    await act(async () => settings.click());
    expect(window.location.pathname).toBe('/settings');
    expect(document.body.querySelector('[data-account-menu]')).toBeNull();

    await act(async () => unmount());
    await dispose();
  });
});
