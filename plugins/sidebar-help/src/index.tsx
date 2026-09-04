import type { Context } from '@deepseek-ai/cordis';
import type {} from '@yunzhen/cordis-ui-i18n';
import type {} from '@yunzhen/cordis-ui-renderer';
import { sidebarHelpMessages } from './locales';
import { SidebarHelp } from './sidebar-help';

export const inject = ['i18n', 'slots'];

export function apply(ctx: Context) {
  ctx.i18n.register(sidebarHelpMessages);
  ctx.slots.inject('sidebar.footer', () => ctx.slots.register(
    { name: 'sidebar.footer', id: 'sidebar-help', order: 110 },
    SidebarHelp,
  ));
}
