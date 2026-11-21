import { describe, expect, it } from 'vitest';
import type { MigrationMap } from './migrations';
import { migrateData } from './migrations';

describe('model/migrations', () => {
  it('returns data unchanged when already at target version', () => {
    const data = { version: 1, name: 'My Circuit', components: [] };
    const res = migrateData(data, 1);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual(data);
    }
  });

  it('fails with error on missing, non-integer, or invalid version', () => {
    expect(migrateData({})).toEqual({
      ok: false,
      error: 'Missing or invalid file version',
    });
    expect(migrateData({ version: 0 })).toEqual({
      ok: false,
      error: 'Missing or invalid file version',
    });
    expect(migrateData({ version: -1 })).toEqual({
      ok: false,
      error: 'Missing or invalid file version',
    });
    expect(migrateData({ version: 1.5 })).toEqual({
      ok: false,
      error: 'Missing or invalid file version',
    });
    expect(migrateData({ version: '1' as unknown as number })).toEqual({
      ok: false,
      error: 'Missing or invalid file version',
    });
    expect(migrateData({ version: null as unknown as number })).toEqual({
      ok: false,
      error: 'Missing or invalid file version',
    });
  });

  it('fails with error mentioning both file version and supported version when file version is newer', () => {
    const res = migrateData({ version: 3 }, 1);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('file version 3');
      expect(res.error).toContain('supported 1');
    }
  });

  it('migrates sequentially through a chain of migrations up to target version', () => {
    const mockMap: MigrationMap = {
      1: (d) => ({ ...d, step1Added: true }),
      2: (d) => ({ ...d, step2Added: 'yes' }),
    };

    const initial = { version: 1, name: 'Test' };
    const res = migrateData(initial, 3, mockMap);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data['version']).toBe(3);
      expect(res.data['name']).toBe('Test');
      expect(res.data['step1Added']).toBe(true);
      expect(res.data['step2Added']).toBe('yes');
    }
  });

  it('returns an error when an intermediate migration step is missing', () => {
    const mockMap: MigrationMap = {
      1: (d) => ({ ...d, step1Added: true }),
      // step 2 missing
    };

    const res = migrateData({ version: 1 }, 3, mockMap);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('No migration available from version 2');
    }
  });

  it('catches migration exceptions and returns an error result instead of throwing', () => {
    const mockMap: MigrationMap = {
      1: () => {
        throw new Error('Something broke inside migration');
      },
    };

    let result: ReturnType<typeof migrateData>;
    expect(() => {
      result = migrateData({ version: 1 }, 2, mockMap);
    }).not.toThrow();

    expect(result!.ok).toBe(false);
    if (!result!.ok) {
      expect(result!.error).toContain(
        'Migration from version 1 failed: Something broke inside migration',
      );
    }
  });

  it('does not mutate the original input object', () => {
    const mockMap: MigrationMap = {
      1: (d) => ({ ...d, mutated: true }),
    };

    const initial = { version: 1, name: 'Immutable' };
    const initialClone = JSON.parse(JSON.stringify(initial));

    migrateData(initial, 2, mockMap);
    expect(initial).toEqual(initialClone);
  });
});
