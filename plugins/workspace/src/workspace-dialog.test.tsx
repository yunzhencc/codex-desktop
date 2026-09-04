// @vitest-environment jsdom

import type { ProjectSessionClient } from './thread-tree-store';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { ProjectSessionStore } from './thread-tree-store';
import { WorkspaceDialog } from './workspace-dialog';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => document.body.replaceChildren());

it('renders a visible disabled submit button before the project is valid', async () => {
  const root = createRoot(document.createElement('div'));

  await act(async () => {
    root.render(<WorkspaceDialog open onOpenChange={() => {}} store={new ProjectSessionStore(new DialogClient())} />);
  });

  const submit = [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find(button => button.textContent === 'workspace.create');
  expect(submit).toMatchObject({ disabled: true, dataset: { slot: 'button' } });

  await act(async () => root.unmount());
});

class DialogClient implements ProjectSessionClient {
  async createProject() {}
  async updateProject() {}
  async deleteProject() {}
  async listProjects() { return []; }
  async listThreads() { return []; }
  async syncUnassignedThreads() { return { assigned: 0, skipped: 0, failed: 0 }; }
}
