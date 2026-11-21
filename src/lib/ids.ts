/**
 * Generates a unique string identifier with the given prefix and 8 base36 random characters.
 */
export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, '0').toLowerCase();
  return `${prefix}_${random}`;
}
