// @vitest-environment jsdom

import { Context } from '@deepseek-ai/cordis';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as themeModule from './index';
import { ThemeRuntime } from './theme';

class MediaQuery {
  matches = false;
  private readonly listeners = new Set<(event: MediaQueryListEvent) => void>();

  addEventListener(_type: 'change', listener: (event: MediaQueryListEvent) => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'change', listener: (event: MediaQueryListEvent) => void) {
    this.listeners.delete(listener);
  }

  get listenerCount() {
    return this.listeners.size;
  }
}

describe('uiThemePlugin', () => {
  let mediaQuery: MediaQuery;

  beforeEach(() => {
    mediaQuery = new MediaQuery();
    vi.stubGlobal('matchMedia', () => mediaQuery);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.head.querySelector('style[data-cordis-ui-theme]')?.remove();
  });

  it('provides theme and styles only while its fiber is active', async () => {
    const ctx = new Context();
    const themeFiber = ctx.plugin(themeModule);
    await themeFiber.await();

    expect(ctx.get('theme')).toBeInstanceOf(ThemeRuntime);
    const style = document.head.querySelector<HTMLStyleElement>('style[data-cordis-ui-theme]');
    expect(style).not.toBeNull();

    await themeFiber.dispose();

    expect(ctx.get('theme')).toBeUndefined();
    expect(document.head.querySelector('style[data-cordis-ui-theme]')).toBeNull();
  });

  it('removes its media listener when later startup fails', async () => {
    const ctx = new Context();
    vi.spyOn(document.head, 'append').mockImplementationOnce(() => {
      throw new Error('style install failed');
    });

    const themeFiber = ctx.plugin(themeModule);
    await expect(themeFiber.await()).rejects.toThrow('style install failed');

    expect(mediaQuery.listenerCount).toBe(0);
    await themeFiber.dispose();
  });
});
