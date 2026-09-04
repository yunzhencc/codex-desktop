import type { Context } from '@deepseek-ai/cordis';
import type {} from '@yunzhen/cordis-ui-i18n';
import type {} from '@yunzhen/cordis-ui-renderer';
import { AppServerProjectSessionClient } from './app-server-client';
import { ProjectSessionsRoot } from './project-sessions-root';
import { ProjectSessionStore } from './thread-tree-store';

const messages = {
  'zh-CN': {
    projectSessions: { title: '项目', expand: '展开 {{name}}', collapse: '收起 {{name}}', loading: '正在加载会话…', unavailable: '无法连接到 Codex。请确认已安装并登录后重试。' },
    workspace: { create: '创建项目', name: '项目名称', sources: '源文件夹', primary: '主要', makePrimary: '设为主要', addFolder: '添加文件夹', removeFolder: '移除文件夹', cancel: '取消', close: '关闭' },
  },
  'en-US': {
    projectSessions: { title: 'Projects', expand: 'Expand {{name}}', collapse: 'Collapse {{name}}', loading: 'Loading sessions…', unavailable: 'Unable to connect to Codex. Check that it is installed and signed in, then try again.' },
    workspace: { create: 'Create project', name: 'Project name', sources: 'Source folders', primary: 'Primary', makePrimary: 'Make primary', addFolder: 'Add folder', removeFolder: 'Remove folder', cancel: 'Cancel', close: 'Close' },
  },
} as const;

export const inject = ['i18n', 'slots'];

export function apply(ctx: Context) {
  ctx.i18n.register(messages);
  const client = new AppServerProjectSessionClient();
  const store = new ProjectSessionStore(client);
  ctx.slots.inject('sidebar.navigation', () => ctx.slots.register(
    { name: 'sidebar.navigation', id: 'project-sessions', order: -100 },
    ProjectSessionsRoot.bind(null, { client, store }),
  ));
}
