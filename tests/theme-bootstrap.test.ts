// @vitest-environment node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const preferenceKey = '@yunzhen/cordis-ui-theme:preference';

function loadPage(preference: string, systemDark: boolean) {
  return new JSDOM(indexHtml, {
    beforeParse(window) {
      window.localStorage.setItem(preferenceKey, preference);
      Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: systemDark }) });
    },
    runScripts: 'dangerously',
    url: 'https://codex-desktop.test',
  });
}

it.each([
  ['dark', false],
  ['system', true],
])('applies %s as a dark first paint before the module app starts', (preference, systemDark) => {
  const page = loadPage(preference, systemDark);
  const root = page.window.document.documentElement;

  expect(root.dataset.theme).toBe('dark');
  expect(root.classList.contains('dark')).toBe(true);
  expect(root.style.colorScheme).toBe('dark');
  expect(page.window.getComputedStyle(root).backgroundColor).toBe('rgb(21, 21, 23)');
  page.window.close();
});
