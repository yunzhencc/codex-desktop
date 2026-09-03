import type { JsonValue, WebBootEntry, WebBootGraph } from '@yunzhen/cordis-client-modules/manifest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { findPackageJSON } from 'node:module';
import { pathToFileURL } from 'node:url';
import { assertWebBootGraph, sortWebBootEntries } from '@yunzhen/cordis-client-modules/manifest';
import { parseDocument } from 'yaml';

interface CatalogRow {
  id: unknown;
  name: unknown;
  disabled?: unknown;
  config?: unknown;
}

interface ClientMetadata {
  platform: unknown;
  inject?: unknown;
  immediately?: unknown;
}

interface PackageManifest {
  exports?: unknown;
  yunzhen?: { client?: ClientMetadata };
}

export function loadWebBootGraph(configPath: string): WebBootGraph {
  const source = readFileSync(configPath, 'utf8');
  if (/!!js(?:\/\S+)?\b/.test(source))
    throw new TypeError('web boot catalog rejects !!js tags');

  const document = parseDocument(source);
  if (document.errors.length > 0)
    throw new TypeError(`web boot catalog YAML error: ${document.errors[0]!.message}`);

  const rows = document.toJS();
  if (!Array.isArray(rows))
    throw new TypeError('web boot catalog must be a top-level array');

  const entries = rows.flatMap((value, index) => loadEntry(value, index, configPath));
  const graph = {
    revision: createHash('sha256').update(JSON.stringify(entries)).digest('hex').slice(0, 12),
    entries: sortWebBootEntries(entries),
  };
  assertWebBootGraph(graph);
  return graph;
}

function loadEntry(value: unknown, index: number, configPath: string): WebBootEntry[] {
  if (!isRecord(value))
    throw new TypeError(`web boot catalog entry ${index} must be an object`);

  const row = value as unknown as CatalogRow;
  if (row.disabled === true)
    return [];
  if (row.disabled !== undefined && typeof row.disabled !== 'boolean')
    throw new TypeError(`web boot catalog disabled must be boolean: ${index}`);
  if (typeof row.id !== 'string' || typeof row.name !== 'string')
    throw new TypeError(`web boot catalog entry ${index} requires id and name`);

  const manifest = loadPackageManifest(row.name, configPath);
  if (!hasClientExport(manifest.exports))
    throw new TypeError(`web boot catalog exports./client missing: ${row.name}`);

  const client = manifest.yunzhen?.client;
  if (!client || client.platform !== 'web')
    throw new TypeError(`web boot catalog client metadata must target web: ${row.name}`);
  if (client.inject !== undefined && (!Array.isArray(client.inject) || client.inject.some(name => typeof name !== 'string')))
    throw new TypeError(`web boot catalog inject must be package names: ${row.name}`);
  if (client.immediately !== undefined && typeof client.immediately !== 'boolean')
    throw new TypeError(`web boot catalog immediately must be boolean: ${row.name}`);

  const config = parseJsonConfig(row.config, row.name);
  return [{
    id: row.id,
    name: row.name,
    inject: client.inject as readonly string[] | undefined ?? [],
    immediately: client.immediately as boolean | undefined ?? false,
    ...(config === undefined ? {} : { config }),
  }];
}

function loadPackageManifest(name: string, configPath: string): PackageManifest {
  const packagePath = findPackageJSON(name, pathToFileURL(configPath));
  if (!packagePath)
    throw new TypeError(`web boot catalog package not found: ${name}`);
  return JSON.parse(readFileSync(packagePath, 'utf8')) as PackageManifest;
}

function hasClientExport(exports: unknown) {
  if (!isRecord(exports))
    return false;
  const client = exports['./client'];
  return typeof client === 'string' || (isRecord(client) && typeof client.default === 'string');
}

function parseJsonConfig(config: unknown, name: string) {
  if (config === undefined)
    return undefined;
  try {
    return JSON.parse(JSON.stringify(config)) as JsonValue;
  }
  catch {
    throw new TypeError(`web boot catalog config must be JSON-safe: ${name}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
