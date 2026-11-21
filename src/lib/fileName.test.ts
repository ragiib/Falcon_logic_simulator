import { describe, expect, it } from 'vitest';
import { sanitizeFileName } from './fileName';

describe('sanitizeFileName', () => {
  it('converts a normal name with spaces to kebab-case with default .json extension', () => {
    expect(sanitizeFileName('My circuit')).toBe('My-circuit.json');
  });

  it('replaces special characters outside [A-Za-z0-9 _-] with underscores', () => {
    expect(sanitizeFileName('My@circuit!#$')).toBe('My_circuit_.json');
  });

  it('falls back to circuit.json when given empty or whitespace-only name', () => {
    expect(sanitizeFileName('')).toBe('circuit.json');
    expect(sanitizeFileName('   ')).toBe('circuit.json');
  });

  it('truncates base names longer than 60 characters and preserves the extension', () => {
    const longName = 'A'.repeat(100);
    const sanitized = sanitizeFileName(longName);
    expect(sanitized).toBe(`${'A'.repeat(60)}.json`);
  });

  it('supports a custom extension with or without leading dot', () => {
    expect(sanitizeFileName('Logic Project', 'txt')).toBe('Logic-Project.txt');
    expect(sanitizeFileName('Logic Project', '.txt')).toBe('Logic-Project.txt');
  });
});
