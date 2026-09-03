/// <reference types="vite/client" />

declare module 'virtual:codex-desktop-boot' {
  import type { PluginRegistry } from '@yunzhen/cordis-client-modules';
  import type { WebBootGraph } from '@yunzhen/cordis-client-modules/manifest';

  export const graph: WebBootGraph;
  export const registry: PluginRegistry;
}
