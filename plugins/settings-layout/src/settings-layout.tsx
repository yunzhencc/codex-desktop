import { Slot } from '@yunzhen/cordis-ui-renderer';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router-dom';
import styles from './index.module.css';

export function SettingsLayout() {
  const { t } = useTranslation();

  return (
    <div className={styles.layout} data-settings-layout>
      <aside className={styles.sidebar}>
        <nav className={styles.navigation} aria-label={t('settings.title')}>
          <Link className={styles.back} to="/">{t('settings.back')}</Link>
          <Slot name="settings.navigation" />
        </nav>
      </aside>
      <main className={styles.main} aria-label="Settings content">
        <div className={styles.content}><Outlet /></div>
      </main>
    </div>
  );
}
