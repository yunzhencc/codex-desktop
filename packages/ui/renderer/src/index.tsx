import type { Context } from '@deepseek-ai/cordis';
import type {} from '@yunzhen/cordis-ui-i18n';
import type { SlotRenderer } from './registry';
import { I18nProvider } from '@yunzhen/cordis-ui-i18n';
import { createRoot } from 'react-dom/client';
import { createSlotRenderer, Slot, SlotOwner, SlotRegistry } from './registry';

export { Slot, SlotOwner, SlotRegistry };
export type { SlotOwnerHandle, SlotRenderer } from './registry';

export interface UiRendererService {
  mount: (container: HTMLElement) => () => void;
  /** @internal */
  slots: SlotRenderer;
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    slots: SlotRegistry;
    uiRenderer: UiRendererService;
  }
}

export const inject = ['i18n'];

export function apply(ctx: Context) {
  const i18n = ctx.i18n;
  const slots = new SlotRegistry(ctx);
  const slotRenderer = createSlotRenderer(slots);
  ctx.provide('uiRenderer', {
    slots: slotRenderer,
    mount(container) {
      const root = createRoot(container);
      root.render(
        <I18nProvider i18n={i18n}>
          <SlotOwner owner={slots.createRootOwner()}>
            <Slot name="root" />
          </SlotOwner>
        </I18nProvider>,
      );
      return () => root.unmount();
    },
  });
}
