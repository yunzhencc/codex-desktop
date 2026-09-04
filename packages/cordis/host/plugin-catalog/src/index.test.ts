import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { loadWebBootGraph } from './index';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

function fixture(config: string, packages: Record<string, object>) {
  const root = mkdtempSync(join(tmpdir(), 'cordis-catalog-'));
  roots.push(root);
  writeFileSync(join(root, 'cordis.yml'), config);

  for (const [name, manifest] of Object.entries(packages)) {
    const directory = join(root, 'node_modules', ...name.split('/'));
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ name, ...manifest }));
  }

  return join(root, 'cordis.yml');
}

function client(metadata: object = {}) {
  return {
    exports: { './client': './client.ts' },
    yunzhen: { client: { platform: 'web', ...metadata } },
  };
}

it('omits disabled rows before topology validation', () => {
  const configPath = fixture(`
- id: renderer
  name: '@fixture/renderer'
- id: dashboard
  name: '@fixture/dashboard'
  disabled: true
`, {
    '@fixture/renderer': client({ immediately: true }),
    '@fixture/dashboard': client({ inject: ['@fixture/missing'] }),
  });

  expect(loadWebBootGraph(configPath).entries.map(entry => entry.id)).toEqual(['renderer']);
});

it('sorts enabled entries by their package metadata dependencies', () => {
  const configPath = fixture(`
- id: dashboard
  name: '@fixture/dashboard'
- id: renderer
  name: '@fixture/renderer'
`, {
    '@fixture/renderer': client({ immediately: true }),
    '@fixture/dashboard': client({ inject: ['@fixture/renderer'] }),
  });

  expect(loadWebBootGraph(configPath).entries.map(entry => entry.id)).toEqual(['renderer', 'dashboard']);
});

it.each([
  [() => fixture(`- id: missing-client\n  name: '@fixture/missing-client'\n`, { '@fixture/missing-client': { yunzhen: { client: { platform: 'web' } } } }), /exports\.\/client/],
  [() => fixture(`- id: dashboard\n  name: '@fixture/dashboard'\n`, { '@fixture/dashboard': client({ inject: ['@fixture/missing'] }) }), /injects inactive package/],
  [() => fixture(`- id: invalid\n  name: '@fixture/invalid'\n  config: !!js/function >\n    function () {}\n`, { '@fixture/invalid': client() }), /!!js/],
])('rejects invalid catalog input', (createFixture, error) => {
  expect(() => loadWebBootGraph(createFixture())).toThrow(error);
});
