import type { ProjectSessionClient } from './thread-tree-store';
import { describe, expect, it } from 'vitest';
import { ProjectSessionStore } from './thread-tree-store';

describe('project session tree', () => {
  it('refreshes projects after creating one', async () => {
    const client = new FakeProjectSessionClient();
    const store = new ProjectSessionStore(client);

    await store.createProject({
      name: 'Desktop',
      roots: [{ path: '/workspace/codex-desktop' }],
    });

    expect(client.createRequests).toEqual([{
      name: 'Desktop',
      roots: [{ path: '/workspace/codex-desktop' }],
    }]);
    expect(store.snapshot().projects.map(project => project.name)).toContain('Desktop');
  });

  it('persists the primary folder by placing it first during an edit', async () => {
    const client = new FakeProjectSessionClient();
    const store = new ProjectSessionStore(client);

    await store.updateProject('beta', {
      name: 'Beta',
      roots: [{ path: '/workspace/contract' }, { path: '/workspace/beta' }],
    });

    expect(client.updateRequests).toEqual([{
      projectId: 'beta',
      name: 'Beta',
      roots: [{ path: '/workspace/contract' }, { path: '/workspace/beta' }],
    }]);
  });

  it('refreshes the tree after removing a project', async () => {
    const client = new FakeProjectSessionClient();
    const store = new ProjectSessionStore(client);
    await store.loadProjects();

    await store.deleteProject('beta');

    expect(client.deleteRequests).toEqual(['beta']);
    expect(store.snapshot().projects.map(project => project.id)).not.toContain('beta');
  });

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
      createProject: async () => {},
      updateProject: async () => {},
      deleteProject: async () => {},
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
  readonly createRequests: Array<{ name: string; roots: readonly { path: string }[] }> = [];
  readonly deleteRequests: string[] = [];
  readonly updateRequests: Array<{ projectId: string; name: string; roots: readonly { path: string }[] }> = [];
  readonly threadRequests: Array<{ projectId: string; parentThreadId: string | null }> = [];
  syncs = 0;
  threadError: Error | undefined;
  projects: Array<{ id: string; name: string; roots: readonly { path: string }[]; position: number }> = [
    { id: 'beta', name: 'Beta', roots: [], position: 2 },
    { id: 'alpha', name: 'Alpha', roots: [], position: 1 },
  ];

  async listProjects() {
    return this.projects;
  }

  async createProject(request: { name: string; roots: readonly { path: string }[] }) {
    this.createRequests.push(request);
    this.projects = [...this.projects, { id: 'desktop', name: request.name, roots: request.roots, position: this.projects.length + 1 }];
  }

  async updateProject(projectId: string, request: { name: string; roots: readonly { path: string }[] }) {
    this.updateRequests.push({ projectId, ...request });
  }

  async deleteProject(projectId: string) {
    this.deleteRequests.push(projectId);
    this.projects = this.projects.filter(project => project.id !== projectId);
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
