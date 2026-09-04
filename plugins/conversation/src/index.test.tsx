// @vitest-environment jsdom

import type { Context as CordisContext } from '@deepseek-ai/cordis';
import * as layout from '@codex-desktop/app-layout';
import { Context } from '@deepseek-ai/cordis';
import * as i18n from '@yunzhen/cordis-ui-i18n';
import * as renderer from '@yunzhen/cordis-ui-renderer';
import * as router from '@yunzhen/cordis-ui-router';
import * as theme from '@yunzhen/cordis-ui-theme';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as localConversation from '../../local-conversation/src';
import * as newThread from '../../new-thread/src';
import * as conversation from './index';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  Object.defineProperty(navigator, 'languages', { configurable: true, value: ['zh-CN'] });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });
});

afterEach(() => localStorage.clear());

async function render(path: string) {
  window.history.replaceState({}, '', path);
  const ctx = new Context();
  const fibers: ReturnType<CordisContext['plugin']>[] = [];
  for (const module of [i18n, renderer, router, layout, theme, conversation, newThread, localConversation]) {
    const fiber = ctx.plugin(module);
    fibers.push(fiber);
    await fiber.await();
  }
  const container = document.createElement('div');
  let unmount!: () => void;
  await act(async () => {
    unmount = ctx.uiRenderer.mount(container);
  });
  return {
    container,
    dispose: async () => {
      await act(async () => unmount());
      for (const fiber of fibers.reverse()) await fiber.dispose();
    },
  };
}

describe('conversation route shell', () => {
  it('places the project context toolbar above the homepage composer', async () => {
    const { container, dispose } = await render('/');

    expect(container.querySelector('[data-conversation-surface="home"] [data-composer-context]')).not.toBeNull();
    expect(container.querySelector('[data-conversation-surface="home"] [data-composer-input]')).not.toBeNull();
    expect(container.querySelector('[data-conversation-surface="home"] button[type="submit"]')?.getAttribute('aria-label')).toBe('发送');

    await dispose();
  });

  it('keeps the composer but omits the homepage toolbar for a local conversation', async () => {
    const { container, dispose } = await render('/local/thread-42');

    expect(container.querySelector('[data-conversation-surface="local"] [data-composer-input]')).not.toBeNull();
    expect(container.querySelector('[data-conversation-surface="local"] [data-composer-context]')).toBeNull();

    await dispose();
  });
});
