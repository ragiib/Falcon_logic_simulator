import { describe, expect, it } from 'vitest';
import type { Signal } from '@/engine';
import { CURRENT_SCHEMA_VERSION } from '@/model';

describe('smoke test', () => {
  it('verifies alias and schema version', () => {
    const dummySignal: Signal = 1;
    expect(dummySignal).toBe(1);
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });
});
