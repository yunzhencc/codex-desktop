import type { Context } from '@deepseek-ai/cordis';
import type {} from '@yunzhen/cordis-ui-i18n';
import type {} from '@yunzhen/cordis-ui-router';
import { SettingsLayout } from './settings-layout';

const messages = {
  'zh-CN': { settings: { back: '返回应用', title: '设置' } },
  'en-US': { settings: { back: 'Back to app', title: 'Settings' } },
} as const;

export const inject = ['i18n', 'routes'];

export function apply(ctx: Context) {
  ctx.i18n.register(messages);
  ctx.routes.register({
    id: 'settings-layout',
    path: 'settings',
    Component: SettingsLayout,
    children: {
      'settings.navigation': { kind: 'list', scope: 'root' },
    },
  });
}
