import type { Context } from '@deepseek-ai/cordis';
import type {} from '@yunzhen/cordis-ui-i18n';
import type {} from '@yunzhen/cordis-ui-router';
import { LocalConversationPage } from './local-conversation-page';

const messages = {
  'zh-CN': { localConversation: { title: '会话' } },
  'en-US': { localConversation: { title: 'Conversation' } },
} as const;

export const inject = ['i18n', 'routes'];

export function apply(ctx: Context) {
  ctx.i18n.register(messages);
  ctx.routes.inject('app-layout', () => ctx.routes.register({
    id: 'local-conversation',
    parentId: 'app-layout',
    path: 'local/:conversationId',
    Component: LocalConversationPage,
  }));
}
