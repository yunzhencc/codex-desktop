import type { I18nRuntime, Locale } from '@yunzhen/cordis-ui-i18n';
import { useTranslation } from 'react-i18next';
import styles from './language-settings.module.css';

export function LanguageSettings({ i18n }: { i18n: I18nRuntime }) {
  const { t } = useTranslation();
  return (
    <section className={styles.row}>
      <div className={styles.copy}>
        <h2>{t('language.title')}</h2>
        <p>{t('language.description')}</p>
      </div>
      <select className={styles.select} aria-label={t('language.label')} value={i18n.locale} onChange={event => void i18n.setLocale(event.currentTarget.value as Locale)}>
        <option value="zh-CN">简体中文</option>
        <option value="en-US">English</option>
      </select>
    </section>
  );
}
