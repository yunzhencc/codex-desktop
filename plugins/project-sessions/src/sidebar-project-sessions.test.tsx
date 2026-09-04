// @vitest-environment jsdom

import type { ProjectSessionClient } from './thread-tree-store';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { ProjectSessionsSidebar } from './sidebar-project-sessions';
import { ProjectSessionStore } from './thread-tree-store';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => window.history.replaceState({}, '', '/'));

it('reveals a project session as a local conversation link after expansion', async () => {
  const store = new ProjectSessionStore(new SidebarClient());
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(<BrowserRouter><ProjectSessionsSidebar store={store} /></BrowserRouter>);
    await store.loadProjects();
  });

  expect(container.querySelector('a')).toBeNull();
  const project = container.querySelector<HTMLButtonElement>('button[data-project-id="alpha"]')!;
  expect(project.querySelectorAll('svg')).toHaveLength(1);
  await act(async () => project.click());

  expect(container.querySelector<HTMLAnchorElement>('a')?.getAttribute('href')).toBe('/local/thread-1');
  expect(container.textContent).toContain('Implement tree');

  await act(async () => root.unmount());
});

class SidebarClient implements ProjectSessionClient {
  async listProjects() {
    return [{ id: 'alpha', name: 'Alpha', roots: [], position: 1 }];
  }

  async listThreads() {
    return [{ id: 'thread-1', projectId: 'alpha', parentThreadId: null, cwd: '/workspace/alpha', name: 'Implement tree', preview: 'Implement tree' }];
  }

  async syncUnassignedThreads() {
    return { assigned: 0, skipped: 0, failed: 0 };
  }
}
