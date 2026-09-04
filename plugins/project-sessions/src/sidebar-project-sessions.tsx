import type { ProjectSessionStore } from './thread-tree-store';
import { Folder } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import styles from './sidebar-project-sessions.module.css';

export function ProjectSessionsSidebar({ store }: { store: ProjectSessionStore }) {
  const { t } = useTranslation();
  const snapshot = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);

  useEffect(() => {
    void store.loadProjects();
  }, [store]);

  return (
    <section aria-label={t('projectSessions.title')} className={styles.root} data-project-sessions>
      {snapshot.error && <p className={styles.error} role="status">{t('projectSessions.unavailable')}</p>}
      {snapshot.projects.map(project => (
        <div key={project.id} className={styles.project}>
          <button
            aria-expanded={project.expanded}
            aria-label={project.expanded ? t('projectSessions.collapse', { name: project.name }) : t('projectSessions.expand', { name: project.name })}
            className={styles.projectButton}
            data-project-id={project.id}
            type="button"
            onClick={() => void store.toggleProject(project.id)}
          >
            <Folder aria-hidden="true" size={16} />
            <span>{project.name}</span>
          </button>
          {project.loading && <span className={styles.loading}>{t('projectSessions.loading')}</span>}
          {project.expanded && !project.loading && (
            <div className={styles.threads}>
              {project.threads.map(thread => (
                <NavLink key={thread.id} className={styles.thread} to={`/local/${thread.id}`}>
                  <span>{thread.name || thread.preview}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
