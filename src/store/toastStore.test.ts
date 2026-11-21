import { beforeEach, describe, expect, it } from 'vitest';
import { useToastStore } from './toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('pushToast returns a generated id and appends toast', () => {
    const id = useToastStore.getState().pushToast('info', 'Hello world');
    expect(typeof id).toBe('string');
    expect(id.startsWith('t_')).toBe(true);

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toEqual({ id, kind: 'info', message: 'Hello world' });
  });

  it('keeps at most 4 toasts and drops the oldest when exceeded', () => {
    const id1 = useToastStore.getState().pushToast('info', 'Msg 1');
    const id2 = useToastStore.getState().pushToast('success', 'Msg 2');
    const id3 = useToastStore.getState().pushToast('warning', 'Msg 3');
    const id4 = useToastStore.getState().pushToast('error', 'Msg 4');

    let toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(4);
    expect(toasts.map((t) => t.id)).toEqual([id1, id2, id3, id4]);

    const id5 = useToastStore.getState().pushToast('info', 'Msg 5');
    toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(4);
    // id1 should have been dropped
    expect(toasts.map((t) => t.id)).toEqual([id2, id3, id4, id5]);
  });

  it('dismissToast removes the toast with matching id', () => {
    const id1 = useToastStore.getState().pushToast('info', 'Msg 1');
    const id2 = useToastStore.getState().pushToast('info', 'Msg 2');

    useToastStore.getState().dismissToast(id1);
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.id).toBe(id2);
  });
});
