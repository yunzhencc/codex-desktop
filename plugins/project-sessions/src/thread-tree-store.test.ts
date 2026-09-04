import type { ProjectSessionClient } from './thread-tree-store';
import { describe, expect, it } from 'vitest';
import { ProjectSessionStore } from './thread-tree-store';

describe('project session tree', () => {
  it('orders projects and loads root threads only when a project is expanded', async () => {
    const client = new FakeProjectSessionClient();
    const store = new ProjectSessionStore(client);

    await store.loadProjects();

    expect(store.snapshot().projects.map(project => project.id)).toEqual(['alpha', 'beta']);
    expect(client.threadRequests).toEqual([]);

    await store.toggleProject('beta');

    expect(store.snapshot().projects.find(project => project.id === 'beta')?.threads.map(thread => thread.id)).toEqual(['thread-2']);
    expect(client.threadRequests).toEqual([{ projectId: 'beta', parentThreadId: null }]);
  });

  it('updates an already loaded thread title from an app-server notification', async () => {
    const store = new ProjectSessionStore(new FakeProjectSessionClient());
    await store.loadProjects();
    await store.toggleProject('beta');

    store.apply({ type: 'thread-name-updated', threadId: 'thread-2', name: 'Sidebar repaired' });

    expect(store.snapshot().projects.find(project => project.id === 'beta')?.threads[0]?.name).toBe('Sidebar repaired');
  });

  it('reloads project metadata when app-server reports a project change', async () => {
    const client = new FakeProjectSessionClient();
    const store = new ProjectSessionStore(client);
    await store.loadProjects();
    await store.toggleProject('beta');
    client.projects = [{ id: 'beta', name: 'Renamed', roots: [], position: 1 }];

    await store.apply({ type: 'refresh' });

    expect(store.snapshot().projects).toEqual([
      {
        id: 'beta',
        name: 'Renamed',
        roots: [],
        position: 1,
        expanded: true,
        loading: false,
        threads: [{ id: 'thread-2', projectId: 'beta', parentThreadId: null, cwd: '/workspace/beta', name: 'Fix sidebar', preview: 'Fix sidebar' }],
      },
    ]);
  });

  it('keeps the sidebar stable when app-server cannot list projects', async () => {
    const store = new ProjectSessionStore({
      listProjects: async () => { throw new Error('Codex is unavailable'); },
      listThreads: async () => [],
      syncUnassignedThreads: async () => ({ assigned: 0, skipped: 0, failed: 0 }),
    });

    await store.loadProjects();

    expect(store.snapshot()).toEqual({ projects: [], error: 'Codex is unavailable' });
  });

  it('refreshes project metadata after assigning unowned threads', async () => {
    const client = new FakeProjectSessionClient();
    const store = new ProjectSessionStore(client);
    await store.loadProjects();
    client.projects = [{ id: 'beta', name: 'Beta with sessions', roots: [], position: 1 }];

    await store.syncUnassignedThreads();

    expect(store.snapshot().projects.map(project => project.name)).toEqual(['Beta with sessions']);
    expect(client.syncs).toBe(1);
  });

  it('reports an error instead of rendering a failed project query as empty', async () => {
    const client = new FakeProjectSessionClient();
    client.threadError = new Error('Codex is unavailable');
    const store = new ProjectSessionStore(client);
    await store.loadProjects();

    await store.toggleProject('beta');

    expect(store.snapshot().error).toBe('Codex is unavailable');
  });
});

class FakeProjectSessionClient implements ProjectSessionClient {
  readonly threadRequests: Array<{ projectId: string; parentThreadId: string | null }> = [];
  syncs = 0;
  threadError: Error | undefined;
  projects = [
    { id: 'beta', name: 'Beta', roots: [], position: 2 },
    { id: 'alpha', name: 'Alpha', roots: [], position: 1 },
  ];

  async listProjects() {
    return this.projects;
  }

  async listThreads(request: { projectId: string; parentThreadId: string | null }) {
    this.threadRequests.push(request);
    if (this.threadError)
      throw this.threadError;
    return request.projectId === 'beta'
      ? [{ id: 'thread-2', projectId: 'beta', parentThreadId: null, cwd: '/workspace/beta', name: 'Fix sidebar', preview: 'Fix sidebar' }]
      : [];
  }

  async syncUnassignedThreads() {
    this.syncs += 1;
    return { assigned: 1, skipped: 0, failed: 0 };
  }
}
