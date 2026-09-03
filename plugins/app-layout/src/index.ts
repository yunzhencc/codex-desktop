import type { Context } from '@deepseek-ai/cordis';
import type {} from '@yunzhen/cordis-ui-router';
import { AppLayoutRoot } from './app-layout';
import { LayoutController } from './layout-controller';

export { LayoutController } from './layout-controller';
export type { LayoutSnapshot } from './layout-controller';

export const inject = ['slots', 'routes'];

export function apply(ctx: Context) {
  const controller = new LayoutController();
  const slots = ctx.get('uiRenderer')!.slots;
  controller.Root = AppLayoutRoot.bind(null, { controller, slots });
  ctx.effect(() => ctx.reflect.provide('layout', controller), 'layout.provide()');
  ctx.routes.register({ id: 'app-layout', Component: controller.Root });
}
