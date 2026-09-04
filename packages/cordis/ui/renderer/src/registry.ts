import type { Context } from '@deepseek-ai/cordis';
import type { SlotEntry, SlotMap, SlotRegistration, SlotSpec } from '@yunzhen/cordis-ui-slots';
import type { ComponentType, ReactNode } from 'react';
import { Service } from '@deepseek-ai/cordis';
import { SlotCore } from '@yunzhen/cordis-ui-slots';
import { createContext, createElement, Fragment, use, useSyncExternalStore } from 'react';

export interface SlotOwnerHandle {
  render: (name: string) => ReactNode;
  dispose: () => void;
}

/** @internal */
export interface SlotRenderer {
  createOwner: (id: string, children: SlotMap) => SlotOwnerHandle;
  entries: (name: string) => readonly SlotEntry[];
  subscribe: (name: string, listener: () => void) => () => void;
  version: (name: string) => number;
}

/** @internal */
export function createSlotRenderer(slots: SlotRegistry): SlotRenderer {
  return {
    createOwner: (id, children) => slots.createOwner(id, children),
    entries: name => slots.entries(name),
    subscribe: (name, listener) => slots.subscribe(name, listener),
    version: name => slots.version(name),
  };
}

const SlotOwnerContext = createContext<SlotOwnerHandle | null>(null);

export function SlotOwner({ children, owner }: { children?: ReactNode; owner: SlotOwnerHandle }) {
  return createElement(SlotOwnerContext.Provider, { value: owner }, children);
}

export function Slot({ name }: { name: string }) {
  const owner = use(SlotOwnerContext);
  if (!owner)
    throw new Error(`slot "${name}" rendered without an owner`);
  return owner.render(name);
}

export class SlotRegistry extends Service {
  private readonly core = new SlotCore();
  private readonly listeners = new Map<string, Set<() => void>>();
  private readonly versions = new Map<string, number>();

  constructor(ctx: Context) {
    super(ctx, 'slots');
  }

  register(options: SlotRegistration, component: ComponentType): () => void {
    const disposeEffect = this.ctx.effect(() => {
      const disposeRegistration = this.core.register(options, component);
      this.publish(options.name);
      return () => {
        disposeRegistration();
        this.publish(options.name);
      };
    }, 'slots.register()');
    return () => {
      void disposeEffect();
    };
  }

  inject(name: string, callback: () => void | (() => void)): () => void {
    const ctx = this.ctx;
    const disposeController = ctx.effect(() => {
      let active: (() => void) | undefined;
      let activeEpoch: number | undefined;
      let stopped = false;
      let unsubscribe = () => {};

      const deactivate = () => {
        const dispose = active;
        active = undefined;
        activeEpoch = undefined;
        dispose?.();
      };

      const stop = () => {
        if (stopped)
          return;
        stopped = true;
        unsubscribe();
        deactivate();
      };

      const reconcile = () => {
        if (stopped)
          return;
        const epoch = this.core.declarationEpoch(name);
        if (active && activeEpoch === epoch)
          return;
        deactivate();
        if (stopped || this.core.declarationEpoch(name) !== epoch)
          return;
        if (!this.core.spec(name))
          return;
        const disposeEffect = ctx.effect(() => callback() ?? (() => {}), `slots.inject(${JSON.stringify(name)}): declaration`);
        active = () => {
          void disposeEffect();
        };
        activeEpoch = epoch;
      };

      const changed = () => {
        try {
          reconcile();
        }
        catch (error) {
          stop();
          if (error && typeof error === 'object' && 'code' in error && error.code === 'INACTIVE_EFFECT')
            return;
          const failure = error instanceof Error ? error : new Error(String(error));
          queueMicrotask(() => {
            throw failure;
          });
        }
      };

      unsubscribe = this.core.subscribeDeclaration(name, changed);
      try {
        reconcile();
      }
      catch (error) {
        stop();
        throw error;
      }
      return stop;
    }, `slots.inject(${JSON.stringify(name)})`);
    return () => {
      void disposeController();
    };
  }

  entries(name: string): readonly SlotEntry[] {
    return this.core.entries(name);
  }

  spec(name: string): SlotSpec | undefined {
    return this.core.spec(name);
  }

  /** @internal */
  createOwner(id: string, children: SlotMap): SlotOwnerHandle {
    const ownedChildren = Object.fromEntries(Object.entries(children).map(([name, spec]) => [name, { ...spec }]));
    const disposeDeclaration = this.core.declare(ownedChildren);
    let live = true;
    return this.owner(id, ownedChildren, () => {
      if (!live)
        return;
      live = false;
      disposeDeclaration();
      for (const name of Object.keys(ownedChildren))
        this.publish(name);
    }, () => live);
  }

  /** @internal */
  createRootOwner(): SlotOwnerHandle {
    return this.owner('root', { root: { kind: 'single', scope: 'root' } }, () => {});
  }

  private owner(id: string, children: SlotMap, dispose: () => void, isLive = () => true): SlotOwnerHandle {
    return {
      dispose,
      render: (name) => {
        if (!isLive())
          throw new Error(`slot owner "${id}" is disposed`);
        if (!Object.hasOwn(children, name))
          throw new Error(`slot "${name}" is not declared by owner "${id}"`);
        return createElement(SlotView, { name, registry: this });
      },
    };
  }

  /** @internal */
  entryOwner(name: string, entry: SlotEntry) {
    return this.owner(entry.id ?? name, entry.children ?? {}, () => {});
  }

  /** @internal */
  subscribe(name: string, listener: () => void) {
    const listeners = this.listeners.get(name) ?? new Set();
    listeners.add(listener);
    this.listeners.set(name, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size)
        this.listeners.delete(name);
    };
  }

  private publish(name: string) {
    this.versions.set(name, (this.versions.get(name) ?? 0) + 1);
    for (const listener of [...this.listeners.get(name) ?? []])
      listener();
  }

  /** @internal */
  version(name: string) {
    return this.versions.get(name) ?? 0;
  }
}

function SlotView({ name, registry }: { name: string; registry: SlotRegistry }) {
  useSyncExternalStore(
    listener => registry.subscribe(name, listener),
    () => registry.version(name),
    () => registry.version(name),
  );
  return createElement(Fragment, null, registry.entries(name).map(entry =>
    createElement(
      SlotOwner,
      { key: entry.id ?? name, owner: registry.entryOwner(name, entry) },
      createElement(entry.component),
    )));
}
