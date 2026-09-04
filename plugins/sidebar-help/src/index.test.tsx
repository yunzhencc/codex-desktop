// @vitest-environment jsdom

import type { Context as CordisContext } from '@deepseek-ai/cordis';
import { Context } from '@deepseek-ai/cordis';
import { apply as applyI18n } from '@yunzhen/cordis-ui-i18n';
import { apply as applyRenderer, inject as rendererInject } from '@yunzhen/cordis-ui-renderer';
import { apply as applyRouter, inject as routerInject } from '@yunzhen/cordis-ui-router';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { apply as applyAccountMenu } from '../../account-menu/src';
import { apply as applyAppLayout } from '../../app-layout/src';
import { apply, inject } from './index';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('sidebar help', () => {
  it('opens and closes the keyboard shortcuts placeholder', async () => {
    window.history.replaceState({}, '', '/');
    Object.defineProperty(navigator, 'languages', { configurable: true, value: ['en-US'] });
    const ctx = new Context();
    const fibers: ReturnType<CordisContext['plugin']>[] = [];
    for (const module of [
      { apply: applyI18n },
      { apply: applyRenderer, inject: rendererInject },
      { apply: applyRouter, inject: routerInject },
      { apply: applyAppLayout, inject: ['slots', 'routes'] },
      { apply: applyAccountMenu, inject: ['i18n', 'slots'] },
      { apply, inject },
    ]) {
      const fiber = ctx.plugin(module);
      fibers.push(fiber);
      await fiber.await();
    }
    ctx.routes.register({ id: 'home', parentId: 'app-layout', index: true, Component: () => null });

    const container = document.createElement('div');
    let unmount!: () => void;
    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    const trigger = container.querySelector<HTMLButtonElement>('[data-sidebar-help-trigger]')!;
    expect(trigger).not.toBeNull();
    await act(async () => trigger.click());

    const menu = document.body.querySelector('[data-sidebar-help-menu]')!;
    expect(menu.textContent).toContain('Keyboard shortcuts');
    expect(menu.textContent).toContain('Help');
    const shortcuts = menu.querySelector<HTMLButtonElement>('[data-keyboard-shortcuts-trigger]')!;
    await act(async () => shortcuts.click());

    const dialog = document.body.querySelector('[data-keyboard-shortcuts-dialog]')!;
    expect(dialog.textContent).toContain('Keyboard shortcuts');
    await act(async () => dialog.querySelector<HTMLButtonElement>('[data-keyboard-shortcuts-close]')!.click());
    expect(document.body.querySelector('[data-keyboard-shortcuts-dialog]')).toBeNull();

    await act(async () => unmount());
    for (const fiber of fibers.reverse()) await fiber.dispose();
  });
});
