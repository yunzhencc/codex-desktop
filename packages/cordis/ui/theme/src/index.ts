import type { Context } from '@deepseek-ai/cordis';
import { installThemeStyles } from './styles';
import { ThemeRuntime } from './theme';

export { ThemeRuntime } from './theme';

declare module '@deepseek-ai/cordis' {
  interface Context {
    theme: ThemeRuntime;
  }
}

export const inject: string[] = [];

export function apply(ctx: Context) {
  const theme = new ThemeRuntime();
  ctx.effect(() => () => theme.dispose(), 'theme.dispose()');
  ctx.reflect.provide('theme', theme);
  ctx.effect(installThemeStyles, 'theme.styles()');
}
