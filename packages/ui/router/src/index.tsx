import type { Context } from '@deepseek-ai/cordis';
import type { SlotOwnerHandle, SlotRenderer } from '@yunzhen/cordis-ui-renderer';
import type { RouteObject } from 'react-router-dom';
import { Slot, SlotOwner } from '@yunzhen/cordis-ui-renderer';
import { createElement, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, matchRoutes, NavLink, Outlet, useLocation, useRoutes } from 'react-router-dom';
import { RouteRegistry } from './routes';

export { RouteRegistry } from './routes';
export type { RouteDefinition, RouteSnapshot } from './routes';

export const inject = ['slots'];

interface RouteRenderer {
  snapshot: RouteRegistry['snapshot'];
  subscribe: RouteRegistry['subscribe'];
}

export function apply(ctx: Context) {
  const routes = new RouteRegistry(ctx);
  const slotService = ctx.slots;
  const slots = ctx.get('uiRenderer')!.slots;
  const routeRenderer: RouteRenderer = {
    snapshot: () => routes.snapshot(),
    subscribe: listener => routes.subscribe(listener),
  };
  slotService.register({ name: 'root' }, () => <RouterRoot routes={routeRenderer} slots={slots} />);
  slotService.inject('main', () => slotService.register({ name: 'main' }, RouteOutlet));
  slotService.inject('sidebar', () => slotService.register({
    name: 'sidebar',
    children: {
      'sidebar.navigation': { kind: 'list', scope: 'root' },
      'sidebar.footer': { kind: 'list', scope: 'root' },
    },
  }, () => <NavigationSidebar routes={routeRenderer} />));
}

function RouterRoot({ routes, slots }: { routes: RouteRenderer; slots: SlotRenderer }) {
  return (
    <BrowserRouter>
      <RouterRoutes routes={routes} slots={slots} />
    </BrowserRouter>
  );
}

function RouterRoutes({ routes, slots }: { routes: RouteRenderer; slots: SlotRenderer }) {
  const snapshot = useSyncExternalStore(routes.subscribe, routes.snapshot, routes.snapshot);
  return useRoutes(toRouteObjects(slots, snapshot));
}

function RouteSlotOwner({ route, slots }: { route: ReturnType<RouteRegistry['snapshot']>[number]; slots: SlotRenderer }) {
  const [committed, setCommitted] = useState<{ owner: SlotOwnerHandle; route: typeof route }>();
  useLayoutEffect(() => {
    const owner = slots.createOwner(route.id, route.children ?? {});
    // The owner must be created after commit; this render installs its context before paint.
    // eslint-disable-next-line react/set-state-in-effect
    setCommitted({ owner, route });
    return owner.dispose;
  }, [route, slots]);
  if (committed?.route !== route)
    return null;
  const Component = route.Component;
  return (
    <SlotOwner owner={committed.owner}>
      <Component />
    </SlotOwner>
  );
}

function RouteOutlet() {
  return <Outlet />;
}

function NavigationSidebar({ routes }: { routes: RouteRenderer }) {
  const { t } = useTranslation();
  const snapshot = useSyncExternalStore(routes.subscribe, routes.snapshot, routes.snapshot);
  const location = useLocation();
  const Sidebar = findMatchedSidebar(snapshot, location.pathname);
  if (Sidebar)
    return createElement(Sidebar);

  const byId = new Map(snapshot.map(route => [route.id, route]));
  const links = snapshot
    .filter(route => route.navigation)
    .sort((left, right) => left.navigation!.order - right.navigation!.order);

  return (
    <>
      <nav>
        {links.map(route => (
          <NavLink key={route.id} to={routeHref(route, byId)}>{route.navigation!.labelKey ? t(route.navigation!.labelKey) : route.navigation!.label}</NavLink>
        ))}
        <Slot name="sidebar.navigation" />
      </nav>
      <footer><Slot name="sidebar.footer" /></footer>
    </>
  );
}

function findMatchedSidebar(routes: ReturnType<RouteRegistry['snapshot']>, pathname: string) {
  const byId = new Map(routes.map(route => [route.id, route]));
  const matches = matchRoutes(toMatchableRouteObjects(routes), pathname) ?? [];
  for (const match of [...matches].reverse()) {
    const Sidebar = match.route.id && byId.get(match.route.id)?.Sidebar;
    if (Sidebar)
      return Sidebar;
  }
}

function toMatchableRouteObjects(routes: ReturnType<RouteRegistry['snapshot']>): RouteObject[] {
  const children = new Map<string | undefined, typeof routes>();
  for (const route of routes)
    children.set(route.parentId, [...children.get(route.parentId) ?? [], route]);

  const build = (route: typeof routes[number]): RouteObject => {
    if (route.index)
      return { id: route.id, index: true };
    return {
      id: route.id,
      path: route.path,
      children: children.get(route.id)?.map(build),
    };
  };

  return children.get(undefined)?.map(build) ?? [];
}

function toRouteObjects(slots: SlotRenderer, routes: ReturnType<RouteRegistry['snapshot']>): RouteObject[] {
  const children = new Map<string | undefined, typeof routes>();
  for (const route of routes)
    children.set(route.parentId, [...children.get(route.parentId) ?? [], route]);

  const build = (route: typeof routes[number]): RouteObject => {
    const element = <RouteSlotOwner key={route.id} route={route} slots={slots} />;
    if (route.index)
      return { id: route.id, index: true, element };
    return {
      id: route.id,
      path: route.path,
      element,
      children: children.get(route.id)?.map(build),
    };
  };

  return children.get(undefined)?.map(build) ?? [];
}

function routeHref(
  route: ReturnType<RouteRegistry['snapshot']>[number],
  byId: Map<string, ReturnType<RouteRegistry['snapshot']>[number]>,
) {
  const paths: string[] = [];
  let current: ReturnType<RouteRegistry['snapshot']>[number] | undefined = route;
  while (current) {
    if (current.path)
      paths.unshift(current.path);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return `/${paths.join('/')}`;
}
