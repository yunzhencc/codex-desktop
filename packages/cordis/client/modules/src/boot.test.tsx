// @vitest-environment jsdom

import type { PluginRegistry } from './boot';
import { Context } from '@deepseek-ai/cordis';
import { expect, it } from 'vitest';
import { activateWebBootGraph, BootFailure, renderBootFailure } from './boot';

it('imports and activates in graph order', async () => {
  const calls: string[] = [];
  const registry: PluginRegistry = new Map([
    ['@app/renderer', async () => ({ apply: () => {
      calls.push('renderer');
    } })],
    ['@app/dashboard', async () => ({ apply: () => {
      calls.push('dashboard');
    } })],
  ]);

  await activateWebBootGraph(new Context(), {
    revision: 'test',
    entries: [
      { id: 'renderer', name: '@app/renderer', inject: [], immediately: false },
      { id: 'dashboard', name: '@app/dashboard', inject: ['@app/renderer'], immediately: false },
    ],
  }, registry);

  expect(calls).toEqual(['renderer', 'dashboard']);
});

it('does not import packages omitted from the boot graph', async () => {
  const calls: string[] = [];
  let dashboardImports = 0;
  const registry: PluginRegistry = new Map([
    ['@app/renderer', async () => ({ apply: () => { calls.push('renderer'); } })],
    ['@app/router', async () => ({ apply: () => { calls.push('router'); } })],
    ['@app/settings', async () => ({ apply: () => { calls.push('settings'); } })],
    ['@app/dashboard', async () => {
      dashboardImports++;
      return {
        apply: () => {
          calls.push('dashboard');
        },
      };
    }],
  ]);

  await activateWebBootGraph(new Context(), {
    revision: 'test',
    entries: [
      { id: 'renderer', name: '@app/renderer', inject: [], immediately: false },
      { id: 'router', name: '@app/router', inject: [], immediately: false },
      { id: 'settings', name: '@app/settings', inject: [], immediately: false },
    ],
  }, registry);

  expect(calls).toEqual(['renderer', 'router', 'settings']);
  expect(dashboardImports).toBe(0);
});

it('names the importing entry on bundle failure', async () => {
  await expect(activateWebBootGraph(new Context(), {
    revision: 'test',
    entries: [{ id: 'dashboard', name: '@app/dashboard', inject: [], immediately: false }],
  }, new Map([['@app/dashboard', async () => { throw new Error('offline'); }]])))
    .rejects
    .toMatchObject({ entryId: 'dashboard', stage: 'import' });
});

it('disposes activated plugins when a later import fails', async () => {
  const calls: string[] = [];
  const registry: PluginRegistry = new Map([
    ['@app/renderer', async () => ({ apply: () => {
      calls.push('renderer');
      return () => {
        calls.push('dispose renderer');
      };
    } })],
    ['@app/dashboard', async () => { throw new Error('offline'); }],
  ]);

  await expect(activateWebBootGraph(new Context(), {
    revision: 'test',
    entries: [
      { id: 'renderer', name: '@app/renderer', inject: [], immediately: false },
      { id: 'dashboard', name: '@app/dashboard', inject: [], immediately: false },
    ],
  }, registry)).rejects.toMatchObject({ entryId: 'dashboard', stage: 'import' });

  expect(calls).toEqual(['renderer', 'dispose renderer']);
});

it('renders import failures in the boot root', () => {
  const container = document.createElement('div');

  renderBootFailure(container, new BootFailure('dashboard', 'import', new Error('offline')));

  expect(container.querySelector('[role="alert"]')?.textContent).toContain('web boot import failed for dashboard: offline');
});
