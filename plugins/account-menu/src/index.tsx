import type { Context } from '@deepseek-ai/cordis';
import type {} from '@yunzhen/cordis-ui-i18n';
import type {} from '@yunzhen/cordis-ui-renderer';
import { AccountMenu } from './account-menu';
import { accountMenuMessages } from './locales';

export const inject = ['i18n', 'slots'];

export function apply(ctx: Context) {
  ctx.i18n.register(accountMenuMessages);
  ctx.slots.inject('sidebar.footer', () => ctx.slots.register(
    { name: 'sidebar.footer', id: 'account-menu', order: 100 },
    AccountMenu,
  ));
}
