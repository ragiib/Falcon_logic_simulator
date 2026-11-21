import { describe, expect, it } from 'vitest';
import { isEditableTarget, matchShortcut } from './shortcutMatch';
import type { KeyLike } from './shortcutMatch';

describe('shortcutMatch', () => {
  const baseEvent = (overrides: Partial<KeyLike> = {}): KeyLike => ({
    key: 'c',
    code: 'KeyC',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...overrides,
  });

  describe('matchShortcut', () => {
    it('matches Ctrl+C/V/D and Meta+C/V/D', () => {
      expect(matchShortcut(baseEvent({ ctrlKey: true, key: 'c', code: 'KeyC' }))).toBe('copy');
      expect(matchShortcut(baseEvent({ metaKey: true, key: 'c', code: 'KeyC' }))).toBe('copy');

      expect(matchShortcut(baseEvent({ ctrlKey: true, key: 'v', code: 'KeyV' }))).toBe('paste');
      expect(matchShortcut(baseEvent({ metaKey: true, key: 'v', code: 'KeyV' }))).toBe('paste');

      expect(matchShortcut(baseEvent({ ctrlKey: true, key: 'd', code: 'KeyD' }))).toBe('duplicate');
      expect(matchShortcut(baseEvent({ metaKey: true, key: 'd', code: 'KeyD' }))).toBe('duplicate');
    });

    it('matches uppercase key with Caps Lock on', () => {
      expect(matchShortcut(baseEvent({ ctrlKey: true, key: 'C', code: 'KeyC' }))).toBe('copy');
      expect(matchShortcut(baseEvent({ ctrlKey: true, key: 'V', code: 'KeyV' }))).toBe('paste');
      expect(matchShortcut(baseEvent({ ctrlKey: true, key: 'D', code: 'KeyD' }))).toBe('duplicate');
    });

    it('matches by code alone for non-QWERTY or international keyboard layouts', () => {
      // In Cyrillic, Greek, Hebrew, etc., key is not Latin 'c' but code is 'KeyC'
      expect(matchShortcut(baseEvent({ ctrlKey: true, key: 'с', code: 'KeyC' }))).toBe('copy');
      expect(matchShortcut(baseEvent({ ctrlKey: true, key: 'м', code: 'KeyV' }))).toBe('paste');
      expect(matchShortcut(baseEvent({ ctrlKey: true, key: 'в', code: 'KeyD' }))).toBe('duplicate');
    });

    it('returns null for plain keys without Ctrl or Meta modifier', () => {
      expect(matchShortcut(baseEvent({ key: 'c', code: 'KeyC' }))).toBeNull();
      expect(matchShortcut(baseEvent({ key: 'v', code: 'KeyV' }))).toBeNull();
      expect(matchShortcut(baseEvent({ key: 'd', code: 'KeyD' }))).toBeNull();
    });

    it('returns null when shiftKey or altKey is pressed', () => {
      // Ctrl+Shift+C (Chrome DevTools)
      expect(
        matchShortcut(baseEvent({ ctrlKey: true, shiftKey: true, key: 'C', code: 'KeyC' })),
      ).toBeNull();
      // Ctrl+Alt+C
      expect(
        matchShortcut(baseEvent({ ctrlKey: true, altKey: true, key: 'c', code: 'KeyC' })),
      ).toBeNull();
      // Meta+Shift+V
      expect(
        matchShortcut(baseEvent({ metaKey: true, shiftKey: true, key: 'V', code: 'KeyV' })),
      ).toBeNull();
    });

    it('returns null for other keys like Ctrl+X or Ctrl+Z', () => {
      expect(matchShortcut(baseEvent({ ctrlKey: true, key: 'x', code: 'KeyX' }))).toBeNull();
      expect(matchShortcut(baseEvent({ ctrlKey: true, key: 'z', code: 'KeyZ' }))).toBeNull();
      expect(matchShortcut(baseEvent({ ctrlKey: true, key: 'a', code: 'KeyA' }))).toBeNull();
    });
  });

  describe('isEditableTarget', () => {
    it('returns false for null or non-object targets', () => {
      expect(isEditableTarget(null)).toBe(false);
      expect(isEditableTarget(undefined as unknown as EventTarget)).toBe(false);
      expect(isEditableTarget('string' as unknown as EventTarget)).toBe(false);
    });

    it('returns true for input, textarea, and select elements case-insensitively', () => {
      expect(isEditableTarget({ tagName: 'input' } as unknown as EventTarget)).toBe(true);
      expect(isEditableTarget({ tagName: 'INPUT' } as unknown as EventTarget)).toBe(true);
      expect(isEditableTarget({ tagName: 'textarea' } as unknown as EventTarget)).toBe(true);
      expect(isEditableTarget({ tagName: 'TEXTAREA' } as unknown as EventTarget)).toBe(true);
      expect(isEditableTarget({ tagName: 'select' } as unknown as EventTarget)).toBe(true);
      expect(isEditableTarget({ tagName: 'SELECT' } as unknown as EventTarget)).toBe(true);
    });

    it('returns true for elements with isContentEditable true', () => {
      expect(isEditableTarget({ isContentEditable: true } as unknown as EventTarget)).toBe(true);
      expect(
        isEditableTarget({ tagName: 'div', isContentEditable: true } as unknown as EventTarget),
      ).toBe(true);
    });

    it('returns false for non-editable elements (div, button, body, etc.)', () => {
      expect(isEditableTarget({ tagName: 'div' } as unknown as EventTarget)).toBe(false);
      expect(isEditableTarget({ tagName: 'DIV' } as unknown as EventTarget)).toBe(false);
      expect(isEditableTarget({ tagName: 'button' } as unknown as EventTarget)).toBe(false);
      expect(isEditableTarget({ tagName: 'BUTTON' } as unknown as EventTarget)).toBe(false);
      expect(isEditableTarget({ tagName: 'body' } as unknown as EventTarget)).toBe(false);
      expect(isEditableTarget({ tagName: 'BODY' } as unknown as EventTarget)).toBe(false);
      expect(
        isEditableTarget({ tagName: 'div', isContentEditable: false } as unknown as EventTarget),
      ).toBe(false);
    });
  });
});
