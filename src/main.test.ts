/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import source from './main.tsx?raw';

const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

describe('web application entry', () => {
  it('creates one native drag region outside the Cordis mount point', () => {
    expect(source).toMatch(/data-tauri-drag-region/);
    expect(source).toMatch(/createAppShell/);
  });

  it('overlays the drag region without reserving a second titlebar row', () => {
    expect(styles).toMatch(/\.app-titlebar \{[\s\S]*?position: absolute;/);
    expect(styles).not.toContain('grid-template-rows: 48px');
  });
});
