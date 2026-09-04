import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(new URL('./index.module.css', import.meta.url), 'utf8');

describe('sidebar footer style', () => {
  it('uses the Codex toolbar frame', () => {
    expect(styles).toMatch(/\.footer \{[\s\S]*?--sidebar-footer-hover: color-mix\(in srgb, var\(--app-text\) 5%, transparent\);[\s\S]*?height: 46px;[\s\S]*?gap: 8px;[\s\S]*?border-top: 0\.5px solid var\(--app-border\);/);
  });
});
