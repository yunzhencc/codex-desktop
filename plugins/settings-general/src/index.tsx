import type {} from '@codex-desktop/settings-layout';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@yunzhen/cordis-ui-i18n';
import { Settings } from 'lucide-react';
import { GeneralSettings } from './general-settings';

const messages = {
  'zh-CN': {
    general: { title: '常规' },
    settings: { groups: { personal: '个人' } },
  },
  'en-US': {
    general: { title: 'General' },
    settings: { groups: { personal: 'Personal' } },
  },
} as const;

export const inject = ['i18n', 'settings', 'slots'];

export function apply(ctx: Context) {
  ctx.i18n.register(messages);
  ctx.settings.register({
    id: 'general',
    group: { id: 'personal', label: 'Personal', labelKey: 'settings.groups.personal', order: 100 },
    label: 'General',
    labelKey: 'general.title',
    Icon: Settings,
    order: 0,
    Component: GeneralSettings,
    children: { 'settings.general.items': { kind: 'list', scope: 'root' } },
  });
}
