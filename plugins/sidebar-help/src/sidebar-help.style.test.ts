import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const component = readFileSync(new URL('./sidebar-help.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./sidebar-help.module.css', import.meta.url), 'utf8');

describe('sidebar help style', () => {
  it('uses Codex icon sizing and footer hover', () => {
    expect(component).toContain('<CircleHelp size={18} />');
    expect(styles).toContain('background: var(--sidebar-footer-hover, var(--app-accent-surface));');
  });
});
