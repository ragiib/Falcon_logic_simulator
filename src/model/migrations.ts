import { CURRENT_SCHEMA_VERSION } from './types';

export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;
export type MigrationMap = Readonly<Record<number, Migration>>; // key N = migrates version N -> N+1
export const migrations: MigrationMap = {}; // empty for now: version 1 is current

export type MigrateResult =
  { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

/**
 * Migrates data through schema versions up to targetVersion.
 * Input data is never mutated.
 */
export function migrateData(
  data: Record<string, unknown>,
  targetVersion: number = CURRENT_SCHEMA_VERSION,
  map: MigrationMap = migrations,
): MigrateResult {
  const rawVersion = data['version'];
  if (typeof rawVersion !== 'number' || !Number.isInteger(rawVersion) || rawVersion < 1) {
    return { ok: false, error: 'Missing or invalid file version' };
  }

  if (rawVersion > targetVersion) {
    return {
      ok: false,
      error: `This file was created by a newer version of the app (file version ${rawVersion}, supported ${targetVersion})`,
    };
  }

  let currentVersion = rawVersion;
  let currentData = { ...data };

  while (currentVersion < targetVersion) {
    const migration = map[currentVersion];
    if (!migration) {
      return {
        ok: false,
        error: `No migration available from version ${currentVersion}`,
      };
    }

    try {
      currentData = migration({ ...currentData });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: `Migration from version ${currentVersion} failed: ${msg}`,
      };
    }

    currentVersion += 1;
    currentData['version'] = currentVersion;
  }

  return { ok: true, data: currentData };
}
