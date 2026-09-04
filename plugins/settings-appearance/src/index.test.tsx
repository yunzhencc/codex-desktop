// @vitest-environment jsdom

import type { Context as CordisContext } from '@deepseek-ai/cordis';
import { Context } from '@deepseek-ai/cordis';
import { apply as applyI18n } from '@yunzhen/cordis-ui-i18n';
import { apply as applyRenderer, inject as rendererInject } from '@yunzhen/cordis-ui-renderer';
import { apply as applyRouter, inject as routerInject } from '@yunzhen/cordis-ui-router';
import { apply as applyTheme } from '@yunzhen/cordis-ui-theme';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apply as applySettingsLayout } from '../../settings-layout/src';
import { apply } from './index';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/settings/appearance');
  Object.defineProperty(navigator, 'languages', { configurable: true, value: ['zh-CN'] });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.head.querySelector('style[data-cordis-ui-theme]')?.remove();
});

async function boot() {
  const ctx = new Context();
  const fibers: ReturnType<CordisContext['plugin']>[] = [];
  for (const module of [
    { apply: applyI18n },
    { apply: applyRenderer, inject: rendererInject },
    { apply: applyRouter, inject: routerInject },
    { apply: applySettingsLayout, inject: ['i18n', 'routes'] },
    { apply: applyTheme },
    { apply, inject: ['i18n', 'settings', 'theme'] },
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

describe('appearance settings', () => {
  it('renders in Settings > Appearance and updates the active theme', async () => {
    const { container, ctx, dispose } = await boot();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    const dark = container.querySelector<HTMLInputElement>('input[value="dark"]')!;
    await act(async () => dark.click());
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(dark.checked).toBe(true);

    await act(async () => unmount());
    await dispose();
  });
});
