import type { WebBootGraph } from '@yunzhen/cordis-client-modules';
import type { Plugin } from 'vite';
import { resolve } from 'node:path';
import { loadWebBootGraph } from '@yunzhen/cordis-host-plugin-catalog';

const virtualModuleId = 'virtual:codex-desktop-boot';
const resolvedVirtualModuleId = `\0${virtualModuleId}`;

export function cordisWebBoot(configPath = resolve(import.meta.dirname, 'cordis.yml')): Plugin {
  let graph: WebBootGraph | undefined;
  const loadGraph = () => graph ??= loadWebBootGraph(configPath);

  return {
    name: 'cordis-desktop-boot',
    buildStart() {
      loadGraph();
    },
    configureServer(server) {
      server.watcher.add(configPath);
    },
    generateBundle() {
      this.emitFile({ fileName: 'cordis.boot.json', source: JSON.stringify(loadGraph(), null, 2), type: 'asset' });
    },
    load(id) {
      if (id !== resolvedVirtualModuleId)
        return;
      const entries = loadGraph().entries;
      const loaders = entries.map((entry, index) => `const load${index} = () => import('${entry.name}/client');`).join('\n');
      const registry = entries.map((entry, index) => `  ['${entry.name}', load${index}],`).join('\n');
      return `${loaders}\nexport const graph = ${JSON.stringify(loadGraph())};\nexport const registry = new Map([\n${registry}\n]);\n`;
    },
    resolveId(id) {
      if (id === virtualModuleId)
        return resolvedVirtualModuleId;
    },
  };
}
