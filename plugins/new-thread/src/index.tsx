import type { Context } from '@deepseek-ai/cordis';
import type {} from '@yunzhen/cordis-ui-i18n';
import type {} from '@yunzhen/cordis-ui-router';
import { NewThreadPage } from './new-thread-page';

const messages = {
  'zh-CN': { newThread: { title: '新建会话' } },
  'en-US': { newThread: { title: 'New chat' } },
} as const;

export const inject = ['i18n', 'routes'];

export function apply(ctx: Context) {
  ctx.i18n.register(messages);
  ctx.routes.inject('conversation', () => ctx.routes.register({
    id: 'new-thread',
    parentId: 'conversation',
    index: true,
    Component: NewThreadPage,
  }));
}
