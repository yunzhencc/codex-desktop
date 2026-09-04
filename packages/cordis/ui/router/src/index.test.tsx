// @vitest-environment jsdom

import type { Context as CordisContext } from '@deepseek-ai/cordis';
import { Context } from '@deepseek-ai/cordis';
import { apply as applyI18n } from '@yunzhen/cordis-ui-i18n';
import { apply as applyRenderer, inject as rendererInject, Slot } from '@yunzhen/cordis-ui-renderer';
import { act, StrictMode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { apply as applyRouter, inject as routerInject } from './index';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, 'languages', { configurable: true, value: ['zh-CN'] });
});

async function boot() {
  const ctx = new Context();
  const i18n = ctx.plugin({ apply: applyI18n });
  await i18n.await();
  const renderer = ctx.plugin({ apply: applyRenderer, inject: rendererInject });
  await renderer.await();
  const router = ctx.plugin({ inject: routerInject, apply: applyRouter });
  await router.await();
  ctx.routes.register({
    id: 'app-layout',
    Component: () => (
      <>
        <Slot name="sidebar" />
        <Slot name="main" />
      </>
    ),
    children: {
      sidebar: { kind: 'single', scope: 'root' },
      main: { kind: 'single', scope: 'root' },
    },
  });
  const fibers = [router, renderer, i18n];
  return {
    ctx,
    container: document.createElement('div'),
    async dispose() {
      for (const fiber of fibers) await fiber.dispose();
    },
    addFiber(fiber: ReturnType<CordisContext['plugin']>) {
      fibers.unshift(fiber);
    },
  };
}

async function bootRouterWithLayout() {
  const app = await boot();
  const Settings = () => <h1>Settings</h1>;
  const layout = app.ctx.plugin({
    inject: ['routes', 'slots', 'i18n'],
    apply(ctx) {
      ctx.i18n.register({
        'zh-CN': { navigation: { dashboard: '仪表盘', settings: '设置' } },
        'en-US': { navigation: { dashboard: 'Dashboard', settings: 'Settings' } },
      });
      ctx.routes.inject('app-layout', () => ctx.routes.register({
        id: 'settings',
        parentId: 'app-layout',
        path: 'settings',
        Component: Settings,
        navigation: { label: 'Settings', labelKey: 'navigation.settings', order: 2 },
      }));
      ctx.routes.inject('app-layout', () => ctx.routes.register({
        id: 'dashboard',
        parentId: 'app-layout',
        path: 'dashboard',
        Component: () => null,
        navigation: { label: 'Dashboard', labelKey: 'navigation.dashboard', order: 1 },
      }));
      ctx.slots.inject('sidebar.navigation', () => ctx.slots.register(
        { name: 'sidebar.navigation', id: 'custom' },
        () => <>Custom</>,
      ));
      ctx.slots.inject('sidebar.footer', () => ctx.slots.register(
        { name: 'sidebar.footer', id: 'account' },
        () => <>Account</>,
      ));
    },
  });
  await layout.await();
  app.addFiber(layout);
  return app;
}

async function bootRouterWithSettingsSlot() {
  const app = await boot();
  const Settings = () => <section><Slot name="settings.section" /></section>;
  const feature = app.ctx.plugin({
    inject: ['routes', 'slots'],
    apply(ctx) {
      ctx.routes.inject('app-layout', () => ctx.routes.register({
        id: 'settings',
        parentId: 'app-layout',
        path: 'settings',
        Component: Settings,
        children: { 'settings.section': { kind: 'list', scope: 'root' } },
      }));
      ctx.slots.inject('settings.section', () => ctx.slots.register(
        { name: 'settings.section', id: 'appearance' },
        () => <>Appearance</>,
      ));
    },
  });
  await feature.await();
  app.addFiber(feature);
  return app;
}

async function bootRouterWithRouteSidebar() {
  const app = await boot();
  const SettingsSidebar = () => (
    <nav data-settings-sidebar>
      <NavLink to="/">Return to app</NavLink>
    </nav>
  );
  const layout = app.ctx.plugin({
    inject: ['routes', 'slots'],
    apply(ctx) {
      ctx.routes.inject('app-layout', () => ctx.routes.register({
        id: 'dashboard',
        parentId: 'app-layout',
        index: true,
        Component: () => <h1>Dashboard</h1>,
        navigation: { label: 'Dashboard', order: 0 },
      }));
      ctx.routes.inject('app-layout', () => ctx.routes.register({
        id: 'settings',
        parentId: 'app-layout',
        path: 'settings',
        Component: Outlet,
        Sidebar: SettingsSidebar,
      }));
      ctx.routes.inject('settings', () => ctx.routes.register({
        id: 'settings.appearance',
        parentId: 'settings',
        path: 'appearance',
        Component: () => <h1>Appearance</h1>,
      }));
    },
  });
  await layout.await();
  app.addFiber(layout);
  return app;
}

describe('router host', () => {
  it('rejects children below an index route instead of dropping them', async () => {
    const { ctx, dispose } = await boot();
    ctx.routes.register({ id: 'index-parent', index: true, Component: () => null });

    expect(() => ctx.routes.register({
      id: 'child',
      parentId: 'index-parent',
      path: 'child',
      Component: () => null,
    })).toThrow('index route cannot have children');

    await dispose();
  });

  it('renders a pathless layout and its settings child through the main slot', async () => {
    window.history.replaceState({}, '', '/settings');
    const { ctx, container, dispose } = await bootRouterWithLayout();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    expect(container.querySelector('h1')?.textContent).toBe('Settings');
    await act(async () => unmount());
    await dispose();
  });

  it('renders a route-declared settings slot inside its matched page', async () => {
    window.history.replaceState({}, '', '/settings');
    const { ctx, container, dispose } = await bootRouterWithSettingsSlot();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    expect(container.textContent).toContain('Appearance');
    await act(async () => unmount());
    await dispose();
  });

  it('renders ordered navigation links and sidebar slots from the route snapshot', async () => {
    window.history.replaceState({}, '', '/settings');
    const { ctx, container, dispose } = await bootRouterWithLayout();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    expect([...container.querySelectorAll('nav a')].map(link => [link.textContent, link.getAttribute('href')])).toEqual([
      ['仪表盘', '/dashboard'],
      ['设置', '/settings'],
    ]);
    expect(container.textContent).toContain('Custom');
    expect(container.textContent).toContain('Account');
    await act(async () => unmount());
    await dispose();
  });

  it('keeps the footer outside the sidebar scroll region', async () => {
    window.history.replaceState({}, '', '/settings');
    const { ctx, container, dispose } = await bootRouterWithLayout();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    const scrollRegion = container.querySelector('[data-sidebar-scroll]')!;
    expect(scrollRegion.querySelector('nav')).not.toBeNull();
    expect(scrollRegion.querySelector('footer')).toBeNull();
    expect(container.querySelector('footer')?.parentElement).not.toBe(scrollRegion);

    await act(async () => unmount());
    await dispose();
  });

  it('replaces the application sidebar for a matched route and restores it when leaving', async () => {
    window.history.replaceState({}, '', '/settings/appearance');
    const { ctx, container, dispose } = await bootRouterWithRouteSidebar();
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });

    expect(container.querySelector('[data-settings-sidebar]')).not.toBeNull();
    expect([...container.querySelectorAll('nav a')].map(link => link.textContent)).toEqual(['Return to app']);

    await act(async () => {
      container.querySelector<HTMLAnchorElement>('[data-settings-sidebar] a')!.click();
    });

    expect(container.querySelector('[data-settings-sidebar]')).toBeNull();
    expect([...container.querySelectorAll('nav a')].map(link => link.textContent)).toEqual(['Dashboard']);
    await act(async () => unmount());
    await dispose();
  });

  it('commits route slot owners safely in StrictMode and replaces them by route definition', async () => {
    window.history.replaceState({}, '', '/settings');
    const { ctx, container, dispose } = await boot();
    const First = () => <StrictMode><Slot name="settings.first" /></StrictMode>;
    const Second = () => <Slot name="settings.second" />;
    ctx.slots.inject('settings.first', () => ctx.slots.register(
      { name: 'settings.first' },
      () => <>First</>,
    ));
    ctx.slots.inject('settings.second', () => ctx.slots.register(
      { name: 'settings.second' },
      () => <>Second</>,
    ));
    const removeFirst = ctx.routes.register({
      id: 'settings',
      parentId: 'app-layout',
      path: 'settings',
      Component: First,
      children: { 'settings.first': { kind: 'single', scope: 'root' } },
    });
    let unmount!: () => void;

    await act(async () => {
      unmount = ctx.uiRenderer.mount(container);
    });
    expect(container.textContent).toBe('First');

    let removeSecond!: () => void;
    await act(async () => {
      removeFirst();
      removeSecond = ctx.routes.register({
        id: 'settings',
        parentId: 'app-layout',
        path: 'settings',
        Component: Second,
        children: { 'settings.second': { kind: 'single', scope: 'root' } },
      });
    });

    expect(container.textContent).toBe('Second');
    expect(ctx.slots.spec('settings.first')).toBeUndefined();
    await act(async () => unmount());
    expect(ctx.slots.spec('settings.second')).toBeUndefined();
    removeSecond();
    await dispose();
  });
});
