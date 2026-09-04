// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Composer } from './composer';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

async function renderComposer(onSubmit = vi.fn()) {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => {
    root.render(<Composer onSubmit={onSubmit} placeholder="Ask Codex" sendLabel="Send" />);
  });
  cleanups.push(() => root.unmount());
  return {
    editor: container.querySelector<HTMLElement>('[data-composer-input]')!,
    onSubmit,
  };
}

async function setEditorText(editor: HTMLElement, text: string) {
  await act(async () => {
    editor.replaceChildren(...text.split('\n').map((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      return paragraph;
    }));
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('composer', () => {
  it('submits multiline text on Enter and clears the editor', async () => {
    const { editor, onSubmit } = await renderComposer();
    await setEditorText(editor, 'first\nsecond');

    await act(async () => {
      editor.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    });

    expect(onSubmit).toHaveBeenCalledWith('first\nsecond');
    expect(editor.textContent).toBe('');
  });

  it('preserves text for Shift+Enter and IME Enter', async () => {
    const { editor, onSubmit } = await renderComposer();
    await setEditorText(editor, '中文');

    const imeEnter = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, isComposing: true, key: 'Enter' });
    await act(async () => {
      editor.dispatchEvent(imeEnter);
      editor.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', shiftKey: true }));
      await Promise.resolve();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(editor.textContent).toContain('中文');
  });
});
