import type { ProjectSessionStore } from './thread-tree-store';
import { Dialog } from '@base-ui/react/dialog';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '@yunzhen/shadcn-ui/components/button';
import { Folder, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './workspace-dialog.module.css';

export function WorkspaceDialog({ onOpenChange, open: visible, store }: { onOpenChange: (open: boolean) => void; open: boolean; store: ProjectSessionStore }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [roots, setRoots] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const addFolders = async () => {
    const selected = await open({ directory: true, multiple: true });
    if (!selected)
      return;
    const paths = Array.isArray(selected) ? selected : [selected];
    setRoots(current => [...current, ...paths.filter(path => !current.includes(path))]);
  };

  const save = async () => {
    if (!name.trim() || !roots.length || saving)
      return;
    setSaving(true);
    try {
      await store.createProject({ name: name.trim(), roots: roots.map(path => ({ path })) });
      onOpenChange(false);
      setName('');
      setRoots([]);
    }
    finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={visible} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup className={styles.dialog} data-workspace-dialog>
          <header className={styles.header}>
            <Dialog.Title>{t('workspace.create')}</Dialog.Title>
            <Dialog.Close aria-label={t('workspace.close')} className={styles.close}><X size={20} /></Dialog.Close>
          </header>
          <label className={styles.field}>
            <span>{t('workspace.name')}</span>
            <input value={name} onChange={event => setName(event.target.value)} />
          </label>
          <section className={styles.sources}>
            <span>{t('workspace.sources')}</span>
            <div className={styles.list}>
              {roots.map((path, index) => (
                <div key={path} className={styles.root}>
                  <Folder size={18} />
                  <span>{path}</span>
                  {index === 0 ? <em>{t('workspace.primary')}</em> : <button type="button" onClick={() => setRoots(current => [path, ...current.filter(entry => entry !== path)])}>{t('workspace.makePrimary')}</button>}
                  <button aria-label={t('workspace.removeFolder')} type="button" onClick={() => setRoots(current => current.filter(entry => entry !== path))}><X size={18} /></button>
                </div>
              ))}
              <button className={styles.add} type="button" onClick={() => void addFolders()}>
                <Plus size={18} />
                {t('workspace.addFolder')}
              </button>
            </div>
          </section>
          <footer className={styles.footer}>
            <Dialog.Close type="button">{t('workspace.cancel')}</Dialog.Close>
            <Button disabled={!name.trim() || !roots.length || saving} type="button" onClick={() => void save()}>{t('workspace.create')}</Button>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
