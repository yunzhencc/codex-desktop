import { expect, it } from 'vitest';
import { assertWebBootGraph, sortWebBootEntries } from './manifest';

it('sorts packages after their injected packages', () => {
  expect(sortWebBootEntries([
    { id: 'dashboard', name: '@app/dashboard', inject: ['@app/layout'], immediately: false },
    { id: 'renderer', name: '@app/renderer', inject: [], immediately: true },
    { id: 'layout', name: '@app/layout', inject: ['@app/renderer'], immediately: false },
  ]).map(entry => entry.id)).toEqual(['renderer', 'layout', 'dashboard']);
});

it('prints the dependency path for a cycle', () => {
  expect(() => sortWebBootEntries([
    { id: 'a', name: '@app/a', inject: ['@app/b'], immediately: false },
    { id: 'b', name: '@app/b', inject: ['@app/a'], immediately: false },
  ])).toThrow('@app/a -> @app/b -> @app/a');
});

it.each([
  [[
    { id: 'renderer', name: '@app/renderer', inject: [], immediately: false },
    { id: 'renderer', name: '@app/layout', inject: [], immediately: false },
  ], /duplicate id/],
  [[
    { id: 'renderer', name: '@app/renderer', inject: [], immediately: false },
    { id: 'layout', name: '@app/renderer', inject: [], immediately: false },
  ], /duplicate package/],
  [[
    { id: 'dashboard', name: '@app/dashboard', inject: ['@app/layout'], immediately: false },
  ], /injects inactive package/],
])('rejects invalid dependency graphs', (entries, error) => {
  expect(() => sortWebBootEntries(entries)).toThrow(error);
});

it('rejects non-JSON configuration', () => {
  expect(() => assertWebBootGraph({
    revision: 'test',
    entries: [{ id: 'renderer', name: '@app/renderer', inject: [], immediately: false, config: { value: undefined } as never }],
  })).toThrow(/config must be JSON-safe/);
});
