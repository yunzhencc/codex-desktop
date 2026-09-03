import type { Fiber, Plugin } from '@deepseek-ai/cordis';
import type {} from '@yunzhen/cordis-ui-renderer';
import type { WebBootGraph } from './manifest';
import { Context } from '@deepseek-ai/cordis';
import { assertWebBootGraph } from './manifest';

export type PluginModule = Plugin.Object<unknown>;

export type PluginRegistry = ReadonlyMap<string, () => Promise<PluginModule>>;

export interface BootWebAppOptions {
  container: HTMLElement;
  graph: WebBootGraph;
  registry: PluginRegistry;
}

export class BootFailure extends Error {
  constructor(
    readonly entryId: string,
    readonly stage: 'registry' | 'import' | 'activate',
    cause: unknown,
  ) {
    super(`web boot ${stage} failed for ${entryId}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
  }
}

export async function activateWebBootGraph(ctx: Context, graph: WebBootGraph, registry: PluginRegistry) {
  assertWebBootGraph(graph);
  const fibers: Fiber[] = [];

  try {
    for (const entry of graph.entries) {
      const importer = registry.get(entry.name);
      if (!importer)
        throw new BootFailure(entry.id, 'registry', new Error(`registry entry missing for ${entry.name}`));

      let module: PluginModule;
      try {
        module = await importer();
      }
      catch (error) {
        throw new BootFailure(entry.id, 'import', error);
      }

      try {
        const fiber = ctx.plugin(module, entry.config);
        fibers.push(fiber);
        await fiber.await();
      }
      catch (error) {
        throw new BootFailure(entry.id, 'activate', error);
      }
    }
  }
  catch (error) {
    await disposeFibers(fibers);
    throw error;
  }

  return fibers;
}

export async function bootWebApp({ container, graph, registry }: BootWebAppOptions) {
  const ctx = new Context();
  let fibers: readonly Fiber[] = [];

  try {
    fibers = await activateWebBootGraph(ctx, graph, registry);
    const unmount = ctx.uiRenderer.mount(container);
    return async () => {
      unmount();
      await disposeFibers(fibers);
    };
  }
  catch (error) {
    await disposeFibers(fibers);
    const failure = error instanceof BootFailure ? error : new BootFailure('unknown', 'activate', error);
    renderBootFailure(container, failure);
    throw failure;
  }
}

export function renderBootFailure(container: HTMLElement, failure: BootFailure) {
  const alert = document.createElement('pre');
  alert.setAttribute('role', 'alert');
  alert.textContent = failure.message;
  container.replaceChildren(alert);
}

async function disposeFibers(fibers: readonly Fiber[]) {
  for (const fiber of [...fibers].reverse()) await fiber.dispose();
}
