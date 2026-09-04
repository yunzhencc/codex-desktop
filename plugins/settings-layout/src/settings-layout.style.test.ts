import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const styles = readFileSync(new URL('./index.module.css', import.meta.url), 'utf8');

it('keeps settings navigation below the window drag region without inseting the whole layout', () => {
  expect(styles).toMatch(/\.sidebar \{[\s\S]*?padding: 64px 16px 16px;/);
  expect(styles).not.toMatch(/\.layout \{[\s\S]*?padding-top:/);
});
