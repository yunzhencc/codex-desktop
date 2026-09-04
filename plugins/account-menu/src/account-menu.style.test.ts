import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(new URL('./account-menu.module.css', import.meta.url), 'utf8');

describe('account menu sidebar style', () => {
  it('uses the Codex sidebar row rhythm', () => {
    expect(styles).toMatch(/\.trigger \{[\s\S]*?flex: 1;[\s\S]*?width: auto;[\s\S]*?gap: 8px;[\s\S]*?height: 30px;[\s\S]*?padding: 0 8px;/);
    expect(styles).toMatch(/\.user \{[\s\S]*?font-size: 14px;[\s\S]*?font-weight: 400;/);
  });
});
