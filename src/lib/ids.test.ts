import { describe, expect, it } from 'vitest';
import { createId } from '@/lib/ids';

describe('ids helper', () => {
  it('includes the given prefix followed by an underscore', () => {
    const id = createId('c');
    expect(id.startsWith('c_')).toBe(true);
    expect(id).toMatch(/^c_[0-9a-z]{8}$/);

    const wireId = createId('wire');
    expect(wireId.startsWith('wire_')).toBe(true);
    expect(wireId).toMatch(/^wire_[0-9a-z]{8}$/);
  });

  it('generates 100 unique ids', () => {
    const ids = Array.from({ length: 100 }, () => createId('test'));
    const unique = new Set(ids);
    expect(unique.size).toBe(100);
  });
});
