import type { Context } from '@deepseek-ai/cordis';
import type {} from '@yunzhen/cordis-ui-i18n';
import type {} from '@yunzhen/cordis-ui-router';
import { ConversationPage } from './conversation-page';

const messages = {
  'zh-CN': {
    conversation: {
      composer: { placeholder: '随心输入', send: '发送' },
      context: { label: '会话上下文', local: '本地', project: '当前项目' },
    },
  },
  'en-US': {
    conversation: {
      composer: { placeholder: 'Message Codex', send: 'Send' },
      context: { label: 'Conversation context', local: 'Local', project: 'Current project' },
    },
  },
} as const;

export const inject = ['i18n', 'routes'];

export function apply(ctx: Context) {
  ctx.i18n.register(messages);
  ctx.routes.inject('app-layout', () => ctx.routes.register({
    id: 'conversation',
    parentId: 'app-layout',
    Component: ConversationPage,
  }));
}
