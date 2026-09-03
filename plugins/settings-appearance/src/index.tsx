import type {} from '@codex-desktop/settings-layout';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@yunzhen/cordis-ui-theme';
import { Palette } from 'lucide-react';
import { AppearanceSettings } from './appearance-settings';
import { appearanceMessages } from './locales';

export const inject = ['i18n', 'settings', 'theme'];

export function apply(ctx: Context) {
  ctx.i18n.register(appearanceMessages);
  const theme = ctx.theme;
  ctx.settings.register({
    id: 'appearance',
    group: { id: 'personal', label: 'Personal', labelKey: 'settings.groups.personal', order: 100 },
    label: 'Appearance',
    labelKey: 'appearance.title',
    Icon: Palette,
    order: 100,
    Component: () => <AppearanceSettings theme={theme} />,
  });
}
