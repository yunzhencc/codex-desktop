import { Dialog } from '@base-ui/react/dialog';
import { Popover } from '@base-ui/react/popover';
import { CircleHelp, ExternalLink, Keyboard, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './sidebar-help.module.css';

export function SidebarHelp() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <>
      <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Popover.Trigger className={styles.trigger} data-sidebar-help-trigger aria-label={t('sidebarHelp.help')}>
          <CircleHelp size={20} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner align="start" side="top" sideOffset={6}>
            <Popover.Popup className={styles.popup} data-sidebar-help-menu initialFocus={false}>
              <button
                className={styles.item}
                data-keyboard-shortcuts-trigger
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setShortcutsOpen(true);
                }}
              >
                <Keyboard size={18} />
                {t('sidebarHelp.keyboardShortcuts')}
              </button>
              <a className={styles.item} href="https://learn.chatgpt.com/docs/quickstart" rel="noreferrer" target="_blank">
                <ExternalLink size={18} />
                {t('sidebarHelp.help')}
              </a>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <Dialog.Root open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className={styles.backdrop} />
          <Dialog.Popup className={styles.dialog} data-keyboard-shortcuts-dialog>
            <div className={styles.dialogHeader}>
              <Dialog.Title className={styles.title}>{t('sidebarHelp.keyboardShortcuts')}</Dialog.Title>
              <Dialog.Close className={styles.close} data-keyboard-shortcuts-close aria-label="Close">
                <X size={24} />
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
