import type { Context } from '@deepseek-ai/cordis';
import { LanguageSettings } from './language-settings';

const messages = {
  'zh-CN': {
    language: {
      description: '应用 UI 语言',
      label: '界面语言',
      title: '语言',
    },
    settings: { groups: { personal: '个人' } },
  },
  'en-US': {
    language: {
      description: 'Application UI language',
      label: 'Interface language',
      title: 'Language',
    },
    settings: { groups: { personal: 'Personal' } },
  },
} as const;

export const inject = ['i18n', 'slots'];

export function apply(ctx: Context) {
  const i18n = ctx.i18n;
  i18n.register(messages);
  ctx.slots.inject('settings.general.items', () => ctx.slots.register(
    { name: 'settings.general.items', id: 'language', order: 0 },
    () => <LanguageSettings i18n={i18n} />,
  ));
}
