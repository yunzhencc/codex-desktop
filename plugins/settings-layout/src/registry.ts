import type { Context } from '@deepseek-ai/cordis';
import type {} from '@yunzhen/cordis-ui-router';
import type { ComponentType } from 'react';
import { Service } from '@deepseek-ai/cordis';

export interface SettingsEntry {
  id: string;
  group: {
    id: string;
    label: string;
    labelKey?: string;
    order: number;
  };
  label: string;
  labelKey?: string;
  Icon?: ComponentType<{ size?: number }>;
  order: number;
  Component: ComponentType;
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    settings: SettingsRegistry;
  }
}

export class SettingsRegistry extends Service {
  private readonly entries = new Map<string, SettingsEntry>();
  private readonly listeners = new Set<() => void>();
  private currentSnapshot: readonly SettingsEntry[] = Object.freeze([]);

  constructor(ctx: Context) {
    super(ctx, 'settings');
  }

  snapshot = () => this.currentSnapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  register(entry: SettingsEntry) {
    const copied = copyEntry(entry);
    this.validate(copied);
    const disposeEffect = this.ctx.effect(() => {
      this.entries.set(copied.id, copied);
      const disposeRoute = this.ctx.routes.inject('settings', () => this.ctx.routes.register({
        id: `settings.${copied.id}`,
        parentId: 'settings',
        path: copied.id,
        Component: copied.Component,
      }));
      this.publish();
      return () => {
        disposeRoute();
        if (this.entries.get(copied.id) === copied) {
          this.entries.delete(copied.id);
          this.publish();
        }
      };
    }, 'settings.register()');
    return () => {
      void disposeEffect();
    };
  }

  private validate(entry: SettingsEntry) {
    if (!/^[a-z][a-z0-9-]*$/.test(entry.id))
      throw new TypeError(`settings entry id must be lowercase kebab-case: ${entry.id}`);
    if (!entry.label.trim())
      throw new TypeError(`settings entry label must not be empty: ${entry.id}`);
    if (!entry.group.id.trim() || !entry.group.label.trim())
      throw new TypeError(`settings entry group must not be empty: ${entry.id}`);
    if (!Number.isFinite(entry.group.order) || !Number.isFinite(entry.order))
      throw new TypeError(`settings entry order must be finite: ${entry.id}`);
    if (this.entries.has(entry.id))
      throw new Error(`duplicate settings entry id: ${entry.id}`);

    const group = [...this.entries.values()].find(item => item.group.id === entry.group.id)?.group;
    if (group && (group.label !== entry.group.label || group.labelKey !== entry.group.labelKey || group.order !== entry.group.order))
      throw new Error(`inconsistent settings group: ${entry.group.id}`);
  }

  private publish() {
    this.currentSnapshot = Object.freeze([...this.entries.values()]
      .sort((left, right) => left.group.order - right.group.order || left.order - right.order || left.id.localeCompare(right.id))
      .map(copyEntry));
    for (const listener of [...this.listeners]) listener();
  }
}

function copyEntry(entry: SettingsEntry): SettingsEntry {
  return Object.freeze({ ...entry, group: Object.freeze({ ...entry.group }) });
}
