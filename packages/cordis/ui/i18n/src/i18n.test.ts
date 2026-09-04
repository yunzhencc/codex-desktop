// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { I18nRuntime } from './i18n';

describe('i18n runtime', () => {
  it('uses the browser language until the user selects another language', async () => {
    localStorage.clear();
    Object.defineProperty(navigator, 'languages', { configurable: true, value: ['zh-CN'] });
    const runtime = new I18nRuntime() as I18nRuntime & { locale: string; setLocale: (locale: string) => Promise<void> };

    expect(runtime.locale).toBe('zh-CN');
    await runtime.setLocale('en-US');
    expect(runtime.locale).toBe('en-US');
  });
});
