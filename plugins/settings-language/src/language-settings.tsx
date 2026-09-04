import type { I18nRuntime, Locale } from '@yunzhen/cordis-ui-i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@yunzhen/shadcn-ui/components/select';
import { useTranslation } from 'react-i18next';
import styles from './language-settings.module.css';

const localeOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
] as const;

export function LanguageSettings({ i18n }: { i18n: I18nRuntime }) {
  const { t } = useTranslation();
  return (
    <section className={styles.row}>
      <div className={styles.copy}>
        <h2>{t('language.title')}</h2>
        <p>{t('language.description')}</p>
      </div>
      <Select items={localeOptions} value={i18n.locale} onValueChange={value => void i18n.setLocale(value as Locale)}>
        <SelectTrigger className={styles.select} aria-label={t('language.label')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {localeOptions.map(({ label, value }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
    </section>
  );
}
