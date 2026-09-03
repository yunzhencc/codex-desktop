import type { ThemeRuntime } from '@yunzhen/cordis-ui-theme';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './appearance-settings.module.css';
import darkPreview from './assets/theme-preview-dark.svg';
import lightPreview from './assets/theme-preview-light.svg';
import systemPreview from './assets/theme-preview-system.svg';

const themePreviews = { dark: darkPreview, light: lightPreview, system: systemPreview } as const;

export function AppearanceSettings({ theme }: { theme: ThemeRuntime }) {
  const { t } = useTranslation();
  const snapshot = useSyncExternalStore(theme.subscribe, () => theme.snapshot);

  return (
    <fieldset className={styles.panel}>
      <legend>{t('appearance.title')}</legend>
      <div className={styles.themeOptions}>
        {(['system', 'light', 'dark'] as const).map(value => (
          <label key={value} className={styles.themeOption}>
            <input
              className={styles.themeInput}
              checked={snapshot.preference === value}
              name="theme"
              type="radio"
              value={value}
              onChange={() => theme.setTheme(value)}
            />
            <span className={styles.preview} data-theme-preview={value} aria-hidden="true">
              <img alt="" src={themePreviews[value]} />
            </span>
            <span>{t(`appearance.preference.${value}`)}</span>
          </label>
        ))}
      </div>
      <div className={styles.controls}>
        <label className={styles.fontSizeRow}>
          <span>{t('appearance.fontSize')}</span>
          <span className={styles.fontSizeControl}>
            <input
              min={12}
              max={20}
              type="range"
              value={snapshot.fontSize}
              onChange={event => theme.setFontSize(Number(event.currentTarget.value))}
            />
            <output>
              {snapshot.fontSize}
              px
            </output>
          </span>
        </label>
      </div>
    </fieldset>
  );
}
