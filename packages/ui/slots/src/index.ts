import type { ComponentType } from 'react';

export type SlotKind = 'single' | 'list';
export type SlotScope = 'root';

export interface SlotSpec {
  kind: SlotKind;
  scope: SlotScope;
}

export type SlotMap = Record<string, SlotSpec>;

export interface SlotEntry {
  component: ComponentType;
  id?: string;
  order?: number;
  children?: SlotMap;
}

export interface SlotRegistration {
  name: string;
  id?: string;
  order?: number;
  children?: SlotMap;
}

interface DeclarationOwner {
  children?: SlotMap;
  live: boolean;
}

interface StoredEntry extends SlotEntry, DeclarationOwner {
  sequence: number;
}

interface SlotRecord {
  declaredBy?: DeclarationOwner;
  entries: StoredEntry[];
  epoch: number;
  listeners: Set<() => void>;
  spec?: SlotSpec;
}

export class SlotCore {
  private readonly records = new Map<string, SlotRecord>();
  private sequence = 0;

  constructor() {
    const root = this.record('root');
    root.spec = { kind: 'single', scope: 'root' };
    root.epoch = 1;
  }

  register(options: SlotRegistration, component: ComponentType): () => void {
    const slot = this.records.get(options.name);
    if (!slot?.spec)
      throw new Error(`slot "${options.name}" is not declared`);

    const children = copyMap(options.children);
    this.validate(slot, options, children);

    const entry: StoredEntry = {
      component,
      ...(options.id === undefined ? {} : { id: options.id }),
      ...(options.order === undefined ? {} : { order: options.order }),
      ...(children === undefined ? {} : { children }),
      live: true,
      sequence: this.sequence++,
    };
    slot.entries.push(entry);

    this.declareChildren(entry, children ?? {});

    return () => this.remove(entry, slot);
  }

  /** @internal */
  declare(children: SlotMap): () => void {
    const ownedChildren = copyMap(children) ?? {};
    this.validateChildren(ownedChildren);
    const owner: DeclarationOwner = { children: ownedChildren, live: true };

    this.declareChildren(owner, ownedChildren);

    return () => {
      if (!owner.live)
        return;
      owner.live = false;
      for (const name of Object.keys(ownedChildren)) {
        const child = this.records.get(name);
        if (child?.declaredBy === owner)
          this.removeDeclaration(child);
      }
    };
  }

  spec(name: string): SlotSpec | undefined {
    const spec = this.records.get(name)?.spec;
    return spec && { ...spec };
  }

  entries(name: string): readonly SlotEntry[] {
    const slot = this.records.get(name);
    if (!slot?.spec)
      return [];

    const entries = slot.spec.kind === 'list'
      ? [...slot.entries].sort((left, right) => (left.order ?? 0) - (right.order ?? 0) || left.sequence - right.sequence)
      : slot.entries;
    return entries.map(copyEntry);
  }

  declarationEpoch(name: string): number {
    return this.records.get(name)?.epoch ?? 0;
  }

  subscribeDeclaration(name: string, listener: () => void): () => void {
    const slot = this.record(name);
    slot.listeners.add(listener);
    return () => slot.listeners.delete(listener);
  }

  private validate(slot: SlotRecord, options: SlotRegistration, children: SlotMap | undefined) {
    this.validateChildren(children ?? {});

    if (slot.spec?.kind === 'single' && slot.entries.length)
      throw new Error(`single slot "${options.name}" already has an entry`);
    if (slot.spec?.kind === 'list') {
      if (typeof options.id !== 'string' || !options.id)
        throw new Error(`list slot "${options.name}" requires an id`);
      if (slot.entries.some(entry => entry.id === options.id))
        throw new Error(`list slot "${options.name}" already has id "${options.id}"`);
      if (options.order !== undefined && !Number.isFinite(options.order))
        throw new Error(`list slot "${options.name}" order must be finite`);
    }
    else if (options.order !== undefined) {
      throw new Error(`single slot "${options.name}" does not accept an order`);
    }
  }

  private validateChildren(children: SlotMap) {
    for (const [name, spec] of Object.entries(children)) {
      if (this.records.get(name)?.spec)
        throw new Error(`duplicate declaration: "${name}"`);
      if (spec.kind !== 'single' && spec.kind !== 'list')
        throw new Error(`slot "${name}" has an invalid kind`);
      if (spec.scope !== 'root')
        throw new Error(`slot "${name}" has an invalid scope`);
    }
  }

  private declareChildren(owner: DeclarationOwner, children: SlotMap) {
    const declared: SlotRecord[] = [];
    for (const [name, spec] of Object.entries(children)) {
      const child = this.record(name);
      child.spec = spec;
      child.declaredBy = owner;
      child.epoch++;
      declared.push(child);
    }
    for (const child of declared) this.notify(child);
  }

  private remove(entry: StoredEntry, slot: SlotRecord) {
    if (!entry.live)
      return;
    entry.live = false;
    slot.entries.splice(slot.entries.indexOf(entry), 1);

    for (const name of Object.keys(entry.children ?? {})) {
      const child = this.records.get(name);
      if (child?.declaredBy === entry)
        this.removeDeclaration(child);
    }
  }

  private removeDeclaration(slot: SlotRecord) {
    slot.spec = undefined;
    slot.declaredBy = undefined;
    slot.epoch++;
    for (const entry of [...slot.entries]) this.remove(entry, slot);
    this.notify(slot);
  }

  private record(name: string): SlotRecord {
    let slot = this.records.get(name);
    if (!slot) {
      slot = { entries: [], epoch: 0, listeners: new Set() };
      this.records.set(name, slot);
    }
    return slot;
  }

  private notify(slot: SlotRecord) {
    for (const listener of [...slot.listeners]) listener();
  }
}

function copyEntry(entry: StoredEntry): SlotEntry {
  return {
    component: entry.component,
    ...(entry.id === undefined ? {} : { id: entry.id }),
    ...(entry.order === undefined ? {} : { order: entry.order }),
    ...(entry.children === undefined ? {} : { children: copyMap(entry.children) }),
  };
}

function copyMap(children: SlotMap | undefined): SlotMap | undefined {
  return children && Object.fromEntries(Object.entries(children).map(([name, spec]) => [name, { ...spec }]));
}
