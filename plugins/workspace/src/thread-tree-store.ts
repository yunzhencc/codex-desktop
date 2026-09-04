export interface ProjectSessionClient {
  listProjects: () => Promise<readonly ProjectRecord[]>;
  createProject: (request: ProjectCreateRequest) => Promise<void>;
  updateProject: (projectId: string, request: ProjectCreateRequest) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  listThreads: (request: ThreadListRequest) => Promise<readonly ThreadRecord[]>;
  syncUnassignedThreads: () => Promise<ThreadProjectSyncResult>;
}

export interface ProjectRoot {
  readonly path: string;
}

export interface ProjectRecord {
  readonly id: string;
  readonly name: string;
  readonly roots: readonly ProjectRoot[];
  readonly position: number;
}

export interface ProjectCreateRequest {
  readonly name: string;
  readonly roots: readonly ProjectRoot[];
}

export interface ThreadListRequest {
  readonly projectId: string;
  readonly parentThreadId: string | null;
}

export interface ThreadRecord {
  readonly id: string;
  readonly projectId: string | null;
  readonly parentThreadId: string | null;
  readonly cwd: string;
  readonly name: string | null;
  readonly preview: string;
}

export interface ThreadProjectSyncResult {
  readonly assigned: number;
  readonly skipped: number;
  readonly failed: number;
}

export interface ProjectTreeNode extends ProjectRecord {
  readonly expanded: boolean;
  readonly loading: boolean;
  readonly threads: readonly ThreadRecord[];
}

export interface ProjectTreeSnapshot {
  readonly projects: readonly ProjectTreeNode[];
  readonly error?: string;
}

export interface ThreadNameUpdatedEvent {
  readonly type: 'thread-name-updated';
  readonly threadId: string;
  readonly name: string | null;
}

export interface RefreshProjectTreeEvent {
  readonly type: 'refresh';
  readonly syncUnassignedThreads?: boolean;
}

export type ProjectSessionEvent = ThreadNameUpdatedEvent | RefreshProjectTreeEvent;

export class ProjectSessionStore {
  private current: ProjectTreeSnapshot = Object.freeze({ projects: [] });
  private readonly listeners = new Set<() => void>();
  private syncPromise: Promise<void> | undefined;

  constructor(private readonly client: ProjectSessionClient) {}

  snapshot = () => this.current;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async loadProjects() {
    try {
      const projects = await this.client.listProjects();
      const existing = new Map(this.current.projects.map(project => [project.id, project]));
      this.update(projects
        .slice()
        .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
        .map((project) => {
          const previous = existing.get(project.id);
          return { ...project, expanded: previous?.expanded ?? false, loading: false, threads: previous?.threads ?? [] };
        }));
    }
    catch (error) {
      this.update(this.current.projects, error instanceof Error ? error.message : 'Unable to load projects');
    }
  }

  async createProject(request: ProjectCreateRequest) {
    await this.client.createProject(request);
    await this.loadProjects();
  }

  async updateProject(projectId: string, request: ProjectCreateRequest) {
    await this.client.updateProject(projectId, request);
    await this.loadProjects();
  }

  async deleteProject(projectId: string) {
    await this.client.deleteProject(projectId);
    await this.loadProjects();
  }

  async toggleProject(projectId: string) {
    const project = this.current.projects.find(entry => entry.id === projectId);
    if (!project)
      return;
    if (project.expanded) {
      this.replace(projectId, { expanded: false });
      return;
    }
    if (project.threads.length) {
      this.replace(projectId, { expanded: true });
      return;
    }

    this.replace(projectId, { expanded: true, loading: true });
    try {
      const threads = await this.client.listThreads({ projectId, parentThreadId: null });
      this.replace(projectId, { loading: false, threads });
    }
    catch (error) {
      this.update(
        this.current.projects.map(entry => entry.id === projectId ? { ...entry, loading: false } : entry),
        error instanceof Error ? error.message : 'Unable to load project sessions',
      );
    }
  }

  syncUnassignedThreads() {
    if (this.syncPromise)
      return this.syncPromise;
    const sync = (async () => {
      try {
        await this.client.syncUnassignedThreads();
        await this.loadProjects();
      }
      catch (error) {
        this.update(this.current.projects, error instanceof Error ? error.message : 'Unable to sync project sessions');
      }
      finally {
        this.syncPromise = undefined;
      }
    })();
    this.syncPromise = sync;
    return sync;
  }

  async apply(event: ProjectSessionEvent) {
    if (event.type === 'refresh') {
      await this.loadProjects();
      return;
    }
    this.update(this.current.projects.map(project => ({
      ...project,
      threads: project.threads.map(thread => thread.id === event.threadId ? { ...thread, name: event.name } : thread),
    })));
  }

  private replace(projectId: string, change: Partial<ProjectTreeNode>) {
    this.update(this.current.projects.map(project => project.id === projectId ? { ...project, ...change } : project));
  }

  private update(projects: readonly ProjectTreeNode[], error?: string) {
    this.current = Object.freeze({ projects: Object.freeze(projects), ...(error ? { error } : {}) });
    for (const listener of [...this.listeners]) listener();
  }
}
