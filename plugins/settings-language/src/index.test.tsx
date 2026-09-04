// @vitest-environment jsdom

import type { Context as CordisContext } from '@deepseek-ai/cordis';
import { Context } from '@deepseek-ai/cordis';
import { apply as applyI18n } from '@yunzhen/cordis-ui-i18n';
import { apply as applyRenderer, inject as rendererInject } from '@yunzhen/cordis-ui-renderer';
import { apply as applyRouter, inject as routerInject } from '@yunzhen/cordis-ui-router';
import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { apply as applyGeneral } from '../../settings-general/src';
import { apply as applySettingsLayout } from '../../settings-layout/src';
import { apply } from './index';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, 'languages', { configurable: true, value: ['zh-CN'] });
  window.history.replaceState({}, '', '/settings/general');
});

async function boot() {
  const ctx = new Context();
  const fibers: ReturnType<CordisContext['plugin']>[] = [];
  for (const module of [
    { apply: applyI18n },
    { apply: applyRenderer, inject: rendererInject },
    { apply: applyRouter, inject: routerInject },
    { apply: applySettingsLayout, inject: ['i18n', 'routes'] },
    { apply: applyGeneral, inject: ['i18n', 'settings', 'slots'] },
    { apply, inject: ['i18n', 'slots'] },
  ]) {
    const fiber = ctx.plugin(module);
    fibers.push(fiber);
    await fiber.await();
  }

  return {
    ctx,
    container: document.createElement('div'),
    async dispose() {
      for (const fiber of fibers.reverse()) await fiber.dispose();
    },
  };
}

describe('language settings', () => {
  it('contributes a language row to Settings > General', async () => {
    const { container, ctx, dispose } = await boot();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    expect(container.querySelector('h1')?.textContent).toBe('常规');
    expect(container.querySelector('[data-settings-menu]')?.textContent).toContain('常规');
    expect(container.textContent).toContain('应用 UI 语言');
    expect(container.querySelector('select')).toBeNull();
    const trigger = container.querySelector<HTMLButtonElement>('[data-slot="select-trigger"]')!;
    expect(trigger.textContent).toContain('简体中文');

    await act(async () => {
      trigger.click();
    });
    const english = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(option => option.textContent === 'English')!;

    await act(async () => {
      english.click();
    });

    expect(container.querySelector('h1')?.textContent).toBe('General');
    expect(container.textContent).toContain('Application UI language');
    expect(trigger.textContent).toContain('English');

    await act(async () => unmount());
    await dispose();
  });
});
