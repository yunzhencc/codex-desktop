import type { ProjectCreateRequest, ProjectRecord, ProjectSessionClient, ProjectSessionEvent, ThreadListRequest, ThreadProjectSyncResult, ThreadRecord } from './thread-tree-store';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export class AppServerProjectSessionClient implements ProjectSessionClient {
  listProjects() {
    return invoke<ProjectRecord[]>('app_server_list_projects');
  }

  createProject(request: ProjectCreateRequest) {
    return invoke<void>('app_server_create_project', { request });
  }

  updateProject(projectId: string, request: ProjectCreateRequest) {
    return invoke<void>('app_server_update_project', { projectId, request });
  }

  deleteProject(projectId: string) {
    return invoke<void>('app_server_delete_project', { projectId });
  }

  listThreads(request: ThreadListRequest) {
    return invoke<ThreadRecord[]>('app_server_list_threads', { request });
  }

  syncUnassignedThreads() {
    return invoke<ThreadProjectSyncResult>('app_server_sync_unassigned_threads');
  }

  subscribe(listener: (event: ProjectSessionEvent) => void) {
    return listen<ProjectSessionEvent>('app-server-project-sessions', event => listener(event.payload));
  }
}
