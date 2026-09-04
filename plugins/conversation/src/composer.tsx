import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { baseKeymap } from 'prosemirror-commands';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { Schema } from 'prosemirror-model';
import { EditorState, Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './composer.module.css';

interface ComposerProps {
  onSubmit?: (text: string) => void;
  placeholder: string;
  sendLabel: string;
}

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'text*', group: 'block', toDOM: () => ['p', 0] },
    text: { group: 'inline' },
  },
});

function textFromDocument(doc: ProseMirrorNode) {
  return doc.textBetween(0, doc.content.size, '\n');
}

export function Composer({ onSubmit, placeholder, sendLabel }: ComposerProps) {
  const [canSubmit, setCanSubmit] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const onSubmitRef = useRef(onSubmit);
  const viewRef = useRef<EditorView | undefined>(undefined);

  onSubmitRef.current = onSubmit;

  const submit = () => {
    const view = viewRef.current;
    if (!view || !onSubmitRef.current)
      return false;
    const text = textFromDocument(view.state.doc);
    if (!text.trim())
      return false;
    onSubmitRef.current(text);
    view.dispatch(view.state.tr.replaceWith(0, view.state.doc.content.size, schema.nodes.paragraph.create()));
    return true;
  };

  useLayoutEffect(() => {
    const view = new EditorView(hostRef.current!, {
      attributes: {
        'aria-multiline': 'true',
        'data-composer-input': '',
        'role': 'textbox',
      },
      dispatchTransaction(transaction) {
        const next = view.state.apply(transaction);
        view.updateState(next);
        setCanSubmit(textFromDocument(next.doc).trim() !== '');
      },
      state: EditorState.create({
        plugins: [
          new Plugin({
            props: {
              handleKeyDown(editor, event) {
                if (event.key !== 'Enter' || event.shiftKey)
                  return false;
                if (event.isComposing || editor.composing)
                  return false;
                submit();
                return true;
              },
            },
          }),
          history(),
          keymap(baseKeymap),
        ],
        schema,
      }),
    });
    viewRef.current = view;
    return () => {
      viewRef.current = undefined;
      view.destroy();
    };
  }, []);

  useEffect(() => {
    viewRef.current?.dom.setAttribute('aria-label', placeholder);
  }, [placeholder]);

  return (
    <form
      className={styles.root}
      data-codex-composer-root
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className={styles.input} data-placeholder={placeholder}>
        <div ref={hostRef} />
        {!canSubmit && <span aria-hidden="true" className={styles.placeholder}>{placeholder}</span>}
      </div>
      <footer className={styles.footer}>
        <div />
        <div />
        <button aria-label={sendLabel} className={styles.submit} disabled={!canSubmit || !onSubmit} type="submit">↑</button>
      </footer>
    </form>
  );
}
