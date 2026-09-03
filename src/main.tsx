import { bootWebApp } from '@yunzhen/cordis-client-modules';
import { graph, registry } from 'virtual:codex-desktop-boot';
import './styles.css';

void bootWebApp({
  container: document.getElementById('root')!,
  graph,
  registry,
}).catch(error => console.error(error));
