export const PREFERENCE_STORAGE_KEY = '@yunzhen/cordis-ui-theme:preference';
export const FONT_SIZE_STORAGE_KEY = '@yunzhen/cordis-ui-theme:font-size';
export const DEFAULT_FONT_SIZE = 14;
export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 17;

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export interface ThemeSnapshot {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  fontSize: number;
}

export class ThemeRuntime {
  private readonly listeners = new Set<() => void>();
  private readonly mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private listeningToMedia = false;
  private disposed = false;

  snapshot: ThemeSnapshot;

  constructor() {
    const preference = getPreference(readStorage(PREFERENCE_STORAGE_KEY));
    const fontSize = getStoredFontSize(readStorage(FONT_SIZE_STORAGE_KEY));
    this.snapshot = {
      preference,
      resolvedTheme: resolveTheme(preference, this.mediaQuery.matches),
      fontSize,
    };
    this.updateMediaListener();
    this.apply();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setTheme(preference: ThemePreference) {
    this.snapshot = {
      ...this.snapshot,
      preference,
      resolvedTheme: resolveTheme(preference, this.mediaQuery.matches),
    };
    writeStorage(PREFERENCE_STORAGE_KEY, preference);
    this.updateMediaListener();
    this.apply();
  }

  setFontSize(fontSize: number) {
    const nextFontSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Number.isFinite(fontSize) ? fontSize : DEFAULT_FONT_SIZE));
    this.snapshot = { ...this.snapshot, fontSize: nextFontSize };
    writeStorage(FONT_SIZE_STORAGE_KEY, String(nextFontSize));
    this.apply();
  }

  dispose() {
    if (this.disposed)
      return;
    this.disposed = true;
    this.stopMediaListener();
    this.listeners.clear();
  }

  private readonly onMediaChange = (event: MediaQueryListEvent) => {
    if (this.disposed || this.snapshot.preference !== 'system')
      return;
    this.snapshot = { ...this.snapshot, resolvedTheme: event.matches ? 'dark' : 'light' };
    this.apply();
  };

  private updateMediaListener() {
    if (this.snapshot.preference === 'system') {
      if (!this.listeningToMedia) {
        this.mediaQuery.addEventListener('change', this.onMediaChange);
        this.listeningToMedia = true;
      }
      return;
    }
    this.stopMediaListener();
  }

  private stopMediaListener() {
    if (!this.listeningToMedia)
      return;
    this.mediaQuery.removeEventListener('change', this.onMediaChange);
    this.listeningToMedia = false;
  }

  private apply() {
    const { fontSize, resolvedTheme } = this.snapshot;
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    document.documentElement.style.setProperty('--app-content-font-size', `${fontSize}px`);
    for (const listener of [...this.listeners]) listener();
  }
}

function getPreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

function getStoredFontSize(value: string | null) {
  const fontSize = Number(value);
  return Number.isFinite(fontSize) && fontSize >= MIN_FONT_SIZE && fontSize <= MAX_FONT_SIZE ? fontSize : DEFAULT_FONT_SIZE;
}

function resolveTheme(preference: ThemePreference, dark: boolean): ResolvedTheme {
  return preference === 'system' ? (dark ? 'dark' : 'light') : preference;
}

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  }
  catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  }
  catch {}
}
