import i18next from 'i18next';

export const LOCALES = ['zh-CN', 'en-US'] as const;
export type Locale = typeof LOCALES[number];

const STORAGE_KEY = '@yunzhen/cordis-ui-i18n:locale';

export class I18nRuntime {
  readonly instance = i18next.createInstance();

  constructor() {
    void this.instance.init({
      fallbackLng: 'en-US',
      initImmediate: false,
      interpolation: { escapeValue: false },
      lng: readLocale() ?? detectLocale(),
    });
  }

  get locale(): Locale {
    return toLocale(this.instance.resolvedLanguage ?? this.instance.language) ?? 'en-US';
  }

  async setLocale(locale: Locale): Promise<void> {
    await this.instance.changeLanguage(locale);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    }
    catch {}
  }

  register(resources: Record<Locale, Record<string, unknown>>): void {
    for (const locale of LOCALES)
      this.instance.addResourceBundle(locale, 'translation', resources[locale], true, true);
  }
}

function detectLocale(): Locale {
  const languages = typeof navigator === 'undefined' ? [] : navigator.languages;
  return languages.some(language => language.toLowerCase().startsWith('zh')) ? 'zh-CN' : 'en-US';
}

function readLocale(): Locale | undefined {
  try {
    return toLocale(localStorage.getItem(STORAGE_KEY));
  }
  catch {
    return undefined;
  }
}

function toLocale(value: string | null): Locale | undefined {
  return LOCALES.find(locale => locale === value);
}
