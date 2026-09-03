import { resolve } from 'node:path';
import { loadWebBootGraph } from '@yunzhen/cordis-host-plugin-catalog';
import { expect, it } from 'vitest';

it('boots the desktop business layout after the generic router', () => {
  const graph = loadWebBootGraph(resolve(process.cwd(), 'cordis.yml'));

  expect(graph.entries.find(entry => entry.name === '@yunzhen/cordis-ui-router')?.inject).toEqual(['@yunzhen/cordis-ui-renderer']);
  expect(graph.entries.find(entry => entry.name === '@codex-desktop/app-layout')?.inject).toEqual([
    '@yunzhen/cordis-ui-renderer',
    '@yunzhen/cordis-ui-router',
  ]);
});
