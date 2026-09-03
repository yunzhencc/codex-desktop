import type { SettingsRegistry } from './registry';
import { createElement, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import styles from './index.module.css';

export function SettingsLayout({ settings }: { settings: SettingsRegistry }) {
  const entries = useSyncExternalStore(settings.subscribe, settings.snapshot, settings.snapshot);
  const location = useLocation();

  if (location.pathname === '/settings' || location.pathname === '/settings/')
    return entries.length ? <Navigate replace to={entries[0]!.id} /> : <SettingsShell settings={settings} />;

  return <SettingsShell settings={settings} />;
}

function SettingsShell({ settings }: { settings: SettingsRegistry }) {
  const { t } = useTranslation();
  const entries = useSyncExternalStore(settings.subscribe, settings.snapshot, settings.snapshot);
  const location = useLocation();
  const groups = new Map<string, typeof entries>();
  for (const entry of entries)
    groups.set(entry.group.id, [...groups.get(entry.group.id) ?? [], entry]);
  const current = entries.find(entry => location.pathname === `/settings/${entry.id}`);

  return (
    <div className={styles.layout} data-settings-layout>
      <aside className={styles.sidebar}>
        <nav className={styles.navigation} aria-label={t('settings.title')}>
          <Link className={styles.back} to="/">{t('settings.back')}</Link>
          <div className={styles.menu} data-settings-menu>
            {[...groups.values()].map(group => (
              <section key={group[0]!.group.id} className={styles.group}>
                <h2>{group[0]!.group.labelKey ? t(group[0]!.group.labelKey) : group[0]!.group.label}</h2>
                {group.map(entry => (
                  <NavLink key={entry.id} className={({ isActive }) => isActive ? `${styles.menuItem} ${styles.active}` : styles.menuItem} to={`/settings/${entry.id}`}>
                    {entry.Icon && createElement(entry.Icon, { size: 18 })}
                    {entry.labelKey ? t(entry.labelKey) : entry.label}
                  </NavLink>
                ))}
              </section>
            ))}
          </div>
        </nav>
      </aside>
      <main className={styles.main} aria-label="Settings content">
        <div className={styles.content}>
          <h1>{current ? (current.labelKey ? t(current.labelKey) : current.label) : t('settings.title')}</h1>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
