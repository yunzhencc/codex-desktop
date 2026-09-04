// @vitest-environment jsdom

import type { Context as CordisContext } from '@deepseek-ai/cordis';
import * as layout from '@codex-desktop/app-layout';
import { Context } from '@deepseek-ai/cordis';
import * as i18n from '@yunzhen/cordis-ui-i18n';
import * as renderer from '@yunzhen/cordis-ui-renderer';
import * as router from '@yunzhen/cordis-ui-router';
import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as conversation from '../../conversation/src';
import * as newThread from '../../new-thread/src';
import * as projectSessions from './index';

const { invoke, listen } = vi.hoisted(() => ({
  invoke: vi.fn(async (command: string) => command === 'app_server_list_projects'
    ? [{ id: 'alpha', name: 'Alpha', position: 1 }]
    : []),
  listen: vi.fn(async () => () => {}),
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));
vi.mock('@tauri-apps/api/event', () => ({ listen }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => {
  invoke.mockClear();
  window.history.replaceState({}, '', '/');
  Object.defineProperty(navigator, 'languages', { configurable: true, value: ['zh-CN'] });
});

afterEach(() => localStorage.clear());

it('mounts app-server projects into the existing conversation sidebar slot', async () => {
  const ctx = new Context();
  const fibers: ReturnType<CordisContext['plugin']>[] = [];
  for (const module of [i18n, renderer, router, layout, conversation, newThread, projectSessions]) {
    const fiber = ctx.plugin(module);
    fibers.push(fiber);
    await fiber.await();
  }
  const container = document.createElement('div');
  let unmount!: () => void;
  await act(async () => {
    unmount = ctx.uiRenderer.mount(container);
  });

  expect(container.querySelector('[data-project-sessions]')?.textContent).toContain('Alpha');
  expect(invoke).toHaveBeenCalledWith('app_server_list_projects');

  await act(async () => unmount());
  for (const fiber of fibers.reverse()) await fiber.dispose();
});
