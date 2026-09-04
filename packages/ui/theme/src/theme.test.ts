// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FONT_SIZE_STORAGE_KEY,
  PREFERENCE_STORAGE_KEY,
  ThemeRuntime,
} from './theme';

class MediaQuery {
  matches = true;
  private readonly listeners = new Set<(event: MediaQueryListEvent) => void>();

  addEventListener(_type: 'change', listener: (event: MediaQueryListEvent) => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'change', listener: (event: MediaQueryListEvent) => void) {
    this.listeners.delete(listener);
  }

  emit(matches: boolean) {
    this.matches = matches;
    for (const listener of this.listeners) listener({ matches } as MediaQueryListEvent);
  }

  get listenerCount() {
    return this.listeners.size;
  }
}

describe('themeRuntime', () => {
  let mediaQuery: MediaQuery;
  let runtimes: ThemeRuntime[];

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';
    mediaQuery = new MediaQuery();
    runtimes = [];
    vi.stubGlobal('matchMedia', () => mediaQuery);
  });

  afterEach(() => {
    for (const runtime of runtimes) runtime.dispose();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const createTheme = () => {
    const runtime = new ThemeRuntime();
    runtimes.push(runtime);
    return runtime;
  };

  it('uses system dark mode when there is no saved preference', () => {
    const theme = createTheme();

    expect(theme.snapshot).toMatchObject({ preference: 'system', resolvedTheme: 'dark', fontSize: 14 });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('restores valid storage and falls back from invalid font size', () => {
    localStorage.setItem(PREFERENCE_STORAGE_KEY, 'light');
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, '200');

    expect(createTheme().snapshot).toMatchObject({ preference: 'light', resolvedTheme: 'light', fontSize: 14 });
  });

  it('reacts to media changes only while preference is system', () => {
    const theme = createTheme();
    mediaQuery.emit(true);
    expect(theme.snapshot.resolvedTheme).toBe('dark');
    theme.setTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    mediaQuery.emit(false);
    expect(theme.snapshot.resolvedTheme).toBe('light');
  });

  it('clamps font size, persists it, and updates the CSS custom property', () => {
    const theme = createTheme();
    theme.setFontSize(100);

    expect(theme.snapshot.fontSize).toBe(17);
    expect(localStorage.getItem(FONT_SIZE_STORAGE_KEY)).toBe('17');
    expect(document.documentElement.style.getPropertyValue('--app-content-font-size')).toBe('17px');
  });

  it('falls back to the default font size for non-finite input', () => {
    const theme = createTheme();
    theme.setFontSize(Number.NaN);

    expect(theme.snapshot.fontSize).toBe(14);
    expect(localStorage.getItem(FONT_SIZE_STORAGE_KEY)).toBe('14');
    expect(document.documentElement.style.getPropertyValue('--app-content-font-size')).toBe('14px');
  });

  it('keeps the page usable when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => createTheme()).not.toThrow();
  });

  it('ignores media changes after disposal', () => {
    const theme = createTheme();
    expect(mediaQuery.listenerCount).toBe(1);
    theme.dispose();
    expect(mediaQuery.listenerCount).toBe(0);
    mediaQuery.emit(false);

    expect(theme.snapshot.resolvedTheme).toBe('dark');
  });
});
