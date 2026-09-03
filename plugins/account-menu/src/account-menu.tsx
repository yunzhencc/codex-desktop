import { Popover } from '@base-ui/react/popover';
import { Settings } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styles from './account-menu.module.css';

export function AccountMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={styles.trigger} data-account-menu-trigger>
        <span className={styles.avatar} aria-hidden="true">L</span>
        <span className={styles.user}>{t('accountMenu.user')}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" side="top" sideOffset={6}>
          <Popover.Popup className={styles.popup} data-account-menu initialFocus={false}>
            <div className={styles.profile}>
              <span className={styles.avatar} aria-hidden="true">L</span>
              <span>{t('accountMenu.user')}</span>
            </div>
            <div className={styles.separator} />
            <Link className={styles.item} to="/settings" onClick={() => setOpen(false)}>
              <Settings size={18} />
              {t('settings.title')}
            </Link>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
