// @vitest-environment jsdom

import type { Context as CordisContext } from '@deepseek-ai/cordis';
import * as layout from '@codex-desktop/app-layout';
import { Context } from '@deepseek-ai/cordis';
import * as i18n from '@yunzhen/cordis-ui-i18n';
import * as renderer from '@yunzhen/cordis-ui-renderer';
import * as router from '@yunzhen/cordis-ui-router';
import * as theme from '@yunzhen/cordis-ui-theme';
import { afterEach, beforeEach, expect, it } from 'vitest';
import * as newThread from './index';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  Object.defineProperty(navigator, 'languages', { configurable: true, value: ['zh-CN'] });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });
});

afterEach(() => localStorage.clear());

it('registers the new conversation page as the root index route', async () => {
  const ctx = new Context();
  const fibers: ReturnType<CordisContext['plugin']>[] = [];
  for (const module of [i18n, renderer, router, layout, theme, newThread]) {
    const fiber = ctx.plugin(module);
    fibers.push(fiber);
    await fiber.await();
  }
  expect(ctx.routes.snapshot().find(route => route.id === 'new-thread')).toMatchObject({ index: true, parentId: 'app-layout' });
  for (const fiber of fibers.reverse()) await fiber.dispose();
});
