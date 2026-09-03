export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface WebBootEntry {
  id: string;
  name: string;
  inject: readonly string[];
  immediately: boolean;
  config?: JsonValue;
}

export interface WebBootGraph {
  revision: string;
  entries: readonly WebBootEntry[];
}

export function assertWebBootGraph(graph: WebBootGraph): asserts graph is WebBootGraph {
  if (!graph || typeof graph.revision !== 'string' || !Array.isArray(graph.entries))
    throw new TypeError('web boot graph must contain a revision and entries');

  sortWebBootEntries(graph.entries);
}

export function sortWebBootEntries(entries: readonly WebBootEntry[]) {
  const entriesByName = new Map<string, WebBootEntry>();
  const ids = new Set<string>();

  for (const entry of entries) {
    assertWebBootEntry(entry);
    if (ids.has(entry.id))
      throw new TypeError(`web boot graph duplicate id: ${entry.id}`);
    if (entriesByName.has(entry.name))
      throw new TypeError(`web boot graph duplicate package: ${entry.name}`);
    ids.add(entry.id);
    entriesByName.set(entry.name, entry);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const sorted: WebBootEntry[] = [];

  const visit = (entry: WebBootEntry, path: readonly string[]) => {
    if (visited.has(entry.name))
      return;
    if (visiting.has(entry.name)) {
      const cycle = [...path.slice(path.indexOf(entry.name)), entry.name];
      throw new TypeError(`web boot graph cycle: ${cycle.join(' -> ')}`);
    }

    visiting.add(entry.name);
    for (const dependency of entry.inject) {
      const injected = entriesByName.get(dependency);
      if (!injected)
        throw new TypeError(`web boot graph injects inactive package: ${entry.name} -> ${dependency}`);
      visit(injected, [...path, entry.name]);
    }
    visiting.delete(entry.name);
    visited.add(entry.name);
    sorted.push(entry);
  };

  for (const entry of entries) visit(entry, []);
  return sorted;
}

function assertWebBootEntry(entry: WebBootEntry) {
  if (!entry || typeof entry.id !== 'string' || entry.id.length === 0)
    throw new TypeError('web boot graph entry id must be a non-empty string');
  if (typeof entry.name !== 'string' || entry.name.length === 0)
    throw new TypeError('web boot graph entry name must be a non-empty string');
  if (!Array.isArray(entry.inject) || entry.inject.some(name => typeof name !== 'string'))
    throw new TypeError(`web boot graph inject must be package names: ${entry.name}`);
  if (typeof entry.immediately !== 'boolean')
    throw new TypeError(`web boot graph immediately must be boolean: ${entry.name}`);
  if (entry.config !== undefined && !isJsonValue(entry.config))
    throw new TypeError(`web boot graph config must be JSON-safe: ${entry.name}`);
}

function isJsonValue(value: unknown, ancestors = new Set<object>()): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return true;
  if (typeof value === 'number')
    return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value))
    return false;

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(value))
    return false;

  const nextAncestors = new Set(ancestors).add(value);
  return Array.isArray(value)
    ? value.every(item => isJsonValue(item, nextAncestors))
    : Object.values(value).every(item => isJsonValue(item, nextAncestors));
}
