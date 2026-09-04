// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { Context } from '@deepseek-ai/cordis';
import { apply as applyI18n } from '@yunzhen/cordis-ui-i18n';
import { apply as applyRenderer, inject as rendererInject } from '@yunzhen/cordis-ui-renderer';
import { apply as applyRouter, inject as routerInject } from '@yunzhen/cordis-ui-router';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { apply } from './index';
import { LayoutController } from './layout-controller';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const Workbench = () => <section>Workbench</section>;
const EmptyPage = () => null;
const layoutStyles = readFileSync('plugins/app-layout/src/index.module.css', 'utf8');

async function bootLayout() {
  const ctx = new Context();
  const i18n = ctx.plugin({ apply: applyI18n });
  await i18n.await();
  const renderer = ctx.plugin({ apply: applyRenderer, inject: rendererInject });
  await renderer.await();
  const router = ctx.plugin({ apply: applyRouter, inject: routerInject });
  await router.await();
  const layout = ctx.plugin({ inject: ['slots', 'routes'], apply });
  await layout.await();
  ctx.routes.register({ id: 'empty', parentId: 'app-layout', index: true, Component: EmptyPage });

  return {
    ctx,
    container: document.createElement('div'),
    async dispose() {
      await layout.dispose();
      await router.dispose();
      await renderer.dispose();
      await i18n.dispose();
    },
  };
}

async function bootStaticLayout() {
  const ctx = new Context();
  const i18n = ctx.plugin({ apply: applyI18n });
  await i18n.await();
  const renderer = ctx.plugin({ apply: applyRenderer, inject: rendererInject });
  await renderer.await();
  const router = ctx.plugin({ apply: applyRouter, inject: routerInject });
  await router.await();
  const layout = ctx.plugin({ inject: ['slots', 'routes'], apply });
  await layout.await();
  ctx.routes.register({ id: 'static', parentId: 'app-layout', index: true, Component: () => <p>Static page</p> });

  return {
    ctx,
    container: document.createElement('div'),
    async dispose() {
      await layout.dispose();
      await router.dispose();
      await renderer.dispose();
      await i18n.dispose();
    },
  };
}

describe('app layout', () => {
  it('keeps the sidebar and main area in separate viewport-bound scroll containers', () => {
    expect(layoutStyles).toContain('.layout {\n  position: relative;\n  height: 100dvh;\n  overflow: hidden;\n}');
    expect(layoutStyles).toContain('.group {\n  height: 100%;\n}');
    expect(layoutStyles).toContain('.sidebar,\n.workbench {\n  box-sizing: border-box;\n  height: 100%;\n  min-width: 0;\n  overflow-x: hidden;\n  overflow-y: auto;');
    expect(layoutStyles).not.toMatch(/\.sidebar,\n\.workbench \{[^}]*padding:/);
    expect(layoutStyles).toContain('.workbench {\n  padding: 16px;\n  border-left: 1px solid var(--app-border);\n}');
    expect(layoutStyles).toContain('.main {\n  box-sizing: border-box;\n  height: 100%;\n  min-width: 0;\n  overflow-x: hidden;\n  overflow-y: auto;');
  });

  it('mounts through the business app route', async () => {
    const { ctx, container, dispose } = await bootStaticLayout();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    expect(container.textContent).toContain('Static page');

    await act(async () => unmount());
    await dispose();
  });

  it('publishes frozen snapshots that external writes cannot mutate', () => {
    const controller = new LayoutController();
    const initial = controller.snapshot();

    expect(Object.isFrozen(initial)).toBe(true);
    expect(() => {
      (initial as { sidebarOpen: boolean }).sidebarOpen = false;
    }).toThrow(TypeError);
    expect(controller.snapshot().sidebarOpen).toBe(true);

    controller.toggleSidebar();
    const updated = controller.snapshot();
    expect(Object.isFrozen(updated)).toBe(true);
    expect(() => {
      (updated as { workbenchOpen: boolean }).workbenchOpen = true;
    }).toThrow(TypeError);
    expect(controller.snapshot()).toEqual({ sidebarOpen: false, workbenchOpen: false });
  });

  it('fully hides the sidebar and lets main fill the frame', async () => {
    const { ctx, container, dispose } = await bootLayout();
    ctx.layout.toggleSidebar();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    expect(container.querySelector('[data-app-layout]')?.getAttribute('data-sidebar-open')).toBe('false');
    expect(container.querySelector('[data-sidebar-column]')).toBeNull();
    expect(container.querySelectorAll('[data-panel]')).toHaveLength(1);

    await act(async () => unmount());
    await dispose();
  });

  it('keeps a collapsed workbench mounted so it can reopen', async () => {
    const { ctx, container, dispose } = await bootLayout();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    expect(container.querySelector('[data-workbench-column]')).toBeNull();
    await act(async () => {
      ctx.slots.register({ name: 'workbench' }, Workbench);
      ctx.layout.openWorkbench();
    });
    expect(container.querySelector('[data-workbench-column]')).not.toBeNull();
    await act(async () => ctx.layout.closeWorkbench());
    expect(container.querySelector('[data-workbench-column]')).not.toBeNull();
    await act(async () => ctx.layout.openWorkbench());
    expect(container.querySelector('[data-workbench-column]')).not.toBeNull();

    await act(async () => unmount());
    await dispose();
  });

  it('shows an occupant registered after the workbench opens', async () => {
    const { ctx, container, dispose } = await bootLayout();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
      ctx.layout.openWorkbench();
    });

    expect(container.querySelector('[data-workbench-column]')).toBeNull();
    await act(async () => {
      ctx.slots.register({ name: 'workbench' }, Workbench);
    });
    expect(container.querySelector('[data-workbench-column]')).not.toBeNull();

    await act(async () => unmount());
    await dispose();
  });

  it('renders draggable Codex-style separators for visible rails', async () => {
    const { ctx, container, dispose } = await bootLayout();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });
    await act(async () => {
      ctx.slots.register({ name: 'workbench' }, Workbench);
      ctx.layout.openWorkbench();
    });

    expect(container.querySelector('[data-group]')).not.toBeNull();
    expect(container.querySelector('#sidebar')).not.toBeNull();
    expect(container.querySelector('#workbench')).not.toBeNull();
    expect(container.querySelectorAll('[data-separator]')).toHaveLength(2);

    await act(async () => unmount());
    await dispose();
  });
});
