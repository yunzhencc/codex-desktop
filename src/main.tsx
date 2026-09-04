import { bootWebApp } from '@yunzhen/cordis-client-modules';
import { graph, registry } from 'virtual:codex-desktop-boot';
import './styles.css';

const root = document.getElementById('root');
if (!root)
  throw new Error('web app: missing #root');

void bootWebApp({
  container: createAppShell(root),
  graph,
  registry,
}).catch(error => console.error(error));

function createAppShell(root: HTMLElement) {
  const titlebar = document.createElement('header');
  titlebar.className = 'app-titlebar';
  titlebar.setAttribute('data-tauri-drag-region', '');

  const content = document.createElement('div');
  content.className = 'app-content';
  root.replaceChildren(titlebar, content);
  return content;
}
