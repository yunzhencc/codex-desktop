// @vitest-environment jsdom

import type { Context as CordisContext } from '@deepseek-ai/cordis';
import * as layout from '@codex-desktop/app-layout';
import { Context } from '@deepseek-ai/cordis';
import * as i18n from '@yunzhen/cordis-ui-i18n';
import * as renderer from '@yunzhen/cordis-ui-renderer';
import * as router from '@yunzhen/cordis-ui-router';
import * as theme from '@yunzhen/cordis-ui-theme';
import { act } from 'react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import * as conversation from '../../conversation/src';
import * as localConversation from './index';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/local/thread-42');
  Object.defineProperty(navigator, 'languages', { configurable: true, value: ['zh-CN'] });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });
});

afterEach(() => localStorage.clear());

it('renders the conversation identified by /local/:conversationId', async () => {
  const ctx = new Context();
  const fibers: ReturnType<CordisContext['plugin']>[] = [];
  for (const module of [i18n, renderer, router, layout, theme, conversation, localConversation]) {
    const fiber = ctx.plugin(module);
    fibers.push(fiber);
    await fiber.await();
  }
  const container = document.createElement('div');
  let unmount!: () => void;

  await act(async () => {
    unmount = ctx.uiRenderer.mount(container);
  });

  expect(container.querySelector('[data-thread-kind="local"]')?.textContent).toContain('thread-42');

  await act(async () => unmount());
  for (const fiber of fibers.reverse()) await fiber.dispose();
});
