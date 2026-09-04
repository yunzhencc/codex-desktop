import type { AppServerProjectSessionClient } from './app-server-client';
import type { ProjectSessionEvent, ProjectSessionStore } from './thread-tree-store';
import { useEffect } from 'react';
import { ProjectSessionsSidebar } from './sidebar-project-sessions';

export function ProjectSessionsRoot({ client, store }: { client: AppServerProjectSessionClient; store: ProjectSessionStore }) {
  useEffect(() => {
    let unsubscribe = () => {};
    void client.subscribe((event: ProjectSessionEvent) => {
      if (event.type === 'refresh' && event.syncUnassignedThreads) {
        void store.syncUnassignedThreads();
        return;
      }
      void store.apply(event);
    }).then((next) => {
      unsubscribe = next;
      void store.syncUnassignedThreads();
    });
    return () => unsubscribe();
  }, [client, store]);

  return <ProjectSessionsSidebar store={store} />;
}
