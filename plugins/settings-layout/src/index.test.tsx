// @vitest-environment jsdom

import { Context } from '@deepseek-ai/cordis';
import { apply as applyI18n } from '@yunzhen/cordis-ui-i18n';
import { apply as applyRenderer, inject as rendererInject } from '@yunzhen/cordis-ui-renderer';
import { apply as applyRouter, inject as routerInject } from '@yunzhen/cordis-ui-router';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { apply as applyAppLayout } from '../../app-layout/src/index';
import { apply } from './index';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

async function boot() {
  const ctx = new Context();
  const i18n = ctx.plugin({ apply: applyI18n });
  await i18n.await();
  const renderer = ctx.plugin({ apply: applyRenderer, inject: rendererInject });
  await renderer.await();
  const router = ctx.plugin({ apply: applyRouter, inject: routerInject });
  await router.await();
  const appLayout = ctx.plugin({ inject: ['slots', 'routes'], apply: applyAppLayout });
  await appLayout.await();
  const settingsLayout = ctx.plugin({ inject: ['i18n', 'routes'], apply });
  await settingsLayout.await();

  return {
    ctx,
    container: document.createElement('div'),
    async dispose() {
      await settingsLayout.dispose();
      await appLayout.dispose();
      await router.dispose();
      await renderer.dispose();
      await i18n.dispose();
    },
  };
}

describe('settings layout', () => {
  it('uses its own shell instead of the conversation workspace', async () => {
    window.history.replaceState({}, '', '/settings');
    const { container, ctx, dispose } = await boot();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    expect(container.querySelector('[data-settings-layout]')).not.toBeNull();
    expect(container.querySelector('[data-app-layout]')).toBeNull();
    expect(container.querySelector('a[href="/"]')?.textContent).toContain('Back to app');
    expect(container.querySelector('nav[aria-label="Settings"]')).not.toBeNull();
    expect(container.querySelector('main[aria-label="Settings content"]')).not.toBeNull();

    await act(async () => unmount());
    await dispose();
  });
});
