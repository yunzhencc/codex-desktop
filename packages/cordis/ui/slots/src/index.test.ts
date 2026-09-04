import { describe, expect, it } from 'vitest';
import { SlotCore } from './index';

const Null = () => null;

describe('slotCore', () => {
  it('cascades a declarer disposal through descendants and contributions', () => {
    const core = new SlotCore();
    const disposeFrame = core.register({ name: 'root', children: { host: { kind: 'single', scope: 'root' } } }, Null);
    core.register({ name: 'host', children: { row: { kind: 'list', scope: 'root' } } }, Null);
    core.register({ name: 'row', id: 'theme' }, Null);

    disposeFrame();

    expect(core.spec('host')).toBeUndefined();
    expect(core.entries('row')).toEqual([]);
  });

  it('rejects an undeclared target and duplicate declaration', () => {
    const core = new SlotCore();

    expect(() => core.register({ name: 'missing' }, Null)).toThrow('not declared');
    core.register({ name: 'root', children: { host: { kind: 'single', scope: 'root' } } }, Null);
    expect(() => core.register({ name: 'root', children: { host: { kind: 'single', scope: 'root' } } }, Null)).toThrow('duplicate declaration');
  });

  it('requires ids for lists and preserves registration order for equal orders', () => {
    const core = new SlotCore();
    core.register({ name: 'root', children: { row: { kind: 'list', scope: 'root' } } }, Null);

    expect(() => core.register({ name: 'row' }, Null)).toThrow('requires an id');
    core.register({ name: 'row', id: 'second', order: 1 }, Null);
    core.register({ name: 'row', id: 'first', order: 1 }, Null);
    core.register({ name: 'row', id: 'before', order: -1 }, Null);

    expect(core.entries('row').map(entry => entry.id)).toEqual(['before', 'second', 'first']);
  });

  it('notifies declaration epochs and lets stale disposers do nothing', () => {
    const core = new SlotCore();
    const changes: number[] = [];
    const unsubscribe = core.subscribeDeclaration('host', () => changes.push(core.declarationEpoch('host')));
    const dispose = core.register({ name: 'root', children: { host: { kind: 'single', scope: 'root' } } }, Null);

    expect(core.declarationEpoch('host')).toBe(1);
    dispose();
    dispose();
    unsubscribe();

    expect(changes).toEqual([1, 2]);
    expect(core.declarationEpoch('host')).toBe(2);
  });

  it('publishes sibling declarations atomically to re-entrant listeners', () => {
    const core = new SlotCore();
    let siblingDeclared = false;
    let duplicateRejected = false;

    core.subscribeDeclaration('first', () => {
      siblingDeclared = core.spec('second') !== undefined;
      try {
        core.register({ name: 'first', children: { second: { kind: 'single', scope: 'root' } } }, Null);
      }
      catch (error) {
        duplicateRejected = error instanceof Error && error.message.includes('duplicate declaration');
      }
    });

    core.register({
      name: 'root',
      children: {
        first: { kind: 'single', scope: 'root' },
        second: { kind: 'single', scope: 'root' },
      },
    }, Null);

    expect({ duplicateRejected, siblingDeclared }).toEqual({ duplicateRejected: true, siblingDeclared: true });
  });

  it('closes a declaration before descendant listeners can register into it', () => {
    const core = new SlotCore();
    const disposeFrame = core.register({ name: 'root', children: { host: { kind: 'single', scope: 'root' } } }, Null);
    core.register({ name: 'host', children: { row: { kind: 'list', scope: 'root' } } }, Null);
    core.subscribeDeclaration('row', () => {
      if (!core.spec('row')) {
        expect(() => core.register({ name: 'host', children: { leaked: { kind: 'list', scope: 'root' } } }, Null)).toThrow('not declared');
      }
    });

    disposeFrame();

    expect(core.spec('host')).toBeUndefined();
    expect(core.spec('row')).toBeUndefined();
    expect(core.spec('leaked')).toBeUndefined();
  });
});
