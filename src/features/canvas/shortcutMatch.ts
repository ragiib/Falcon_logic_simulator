export type ShortcutAction = 'copy' | 'paste' | 'duplicate' | null;

export interface KeyLike {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export function matchShortcut(e: KeyLike): ShortcutAction {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) {
    return null;
  }

  const code = e.code;
  const keyLower = e.key.toLowerCase();

  if (code === 'KeyC' || keyLower === 'c') {
    return 'copy';
  }
  if (code === 'KeyV' || keyLower === 'v') {
    return 'paste';
  }
  if (code === 'KeyD' || keyLower === 'd') {
    return 'duplicate';
  }

  return null;
}

export function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || typeof el !== 'object') {
    return false;
  }

  const target = el as { tagName?: unknown; isContentEditable?: unknown };

  if (typeof target.isContentEditable === 'boolean' && target.isContentEditable) {
    return true;
  }

  if (typeof target.tagName === 'string') {
    const tag = target.tagName.toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return true;
    }
  }

  return false;
}
