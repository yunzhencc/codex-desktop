// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { Context } from '@deepseek-ai/cordis';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as themeModule from './index';
import { ThemeRuntime } from './theme';

const tokens = readFileSync('packages/ui/theme/src/tokens.css', 'utf8');

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

  it('applies the system font stack from the theme tokens', () => {
    const style = document.createElement('style');
    style.textContent = tokens;
    document.head.append(style);

    expect(getComputedStyle(document.documentElement).fontFamily).toBe('-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif');
    style.remove();
  });
});
