import type { Context } from '@deepseek-ai/cordis';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { I18nRuntime } from './i18n';

export { I18nRuntime, LOCALES } from './i18n';
export type { Locale } from './i18n';

declare module '@deepseek-ai/cordis' {
  interface Context {
    i18n: I18nRuntime;
  }
}

export const inject: string[] = [];

export function apply(ctx: Context) {
  ctx.provide('i18n', new I18nRuntime());
}

export function I18nProvider({ children, i18n }: { children: ReactNode; i18n: I18nRuntime }) {
  return <I18nextProvider i18n={i18n.instance}>{children}</I18nextProvider>;
}
