import type { ComponentType } from 'react';

export interface LayoutSnapshot {
  readonly sidebarOpen: boolean;
  readonly workbenchOpen: boolean;
}

export interface PanelBounds {
  readonly defaultSize: number;
  readonly maxSize: number;
  readonly minSize: number;
}

export const MAIN_MIN_WIDTH = 352;

export function getWorkspaceWidth(shellWidth: number, sidebarOpen: boolean, sidebarWidth: number) {
  return Math.max(0, shellWidth - (sidebarOpen ? sidebarWidth : 0));
}

export function getSidebarBounds(shellWidth: number): PanelBounds {
  const minSize = 240;
  const maxSize = Math.max(minSize, Math.min(520, shellWidth - minSize));
  return { defaultSize: clamp(275, minSize, maxSize), maxSize, minSize };
}

export function getWorkbenchBounds(workspaceWidth: number, shellHeight: number): PanelBounds {
  const minSize = 320;
  const maxSize = Math.max(minSize, workspaceWidth - MAIN_MIN_WIDTH);
  const defaultSize = Math.max(minSize, Math.min(shellHeight * 1.6, workspaceWidth - 500, 640));
  return { defaultSize: clamp(defaultSize, minSize, maxSize), maxSize, minSize };
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    layout: LayoutController;
  }
}

export class LayoutController {
  Root: ComponentType = () => null;
  private current: LayoutSnapshot = Object.freeze({ sidebarOpen: true, workbenchOpen: false });
  private readonly listeners = new Set<() => void>();

  snapshot = () => this.current;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  toggleSidebar = () => this.update({ sidebarOpen: !this.current.sidebarOpen });

  openSidebar = () => this.update({ sidebarOpen: true });

  closeSidebar = () => this.update({ sidebarOpen: false });

  openWorkbench = () => this.update({ workbenchOpen: true });

  closeWorkbench = () => this.update({ workbenchOpen: false });

  toggleWorkbench = () => this.update({ workbenchOpen: !this.current.workbenchOpen });

  private update(change: Partial<LayoutSnapshot>) {
    const next = { ...this.current, ...change };
    if (next.sidebarOpen === this.current.sidebarOpen && next.workbenchOpen === this.current.workbenchOpen)
      return;
    this.current = Object.freeze(next);
    for (const listener of [...this.listeners]) listener();
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
