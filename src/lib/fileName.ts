export function sanitizeFileName(name: string, extension = 'json'): string {
  let base = name.trim();
  base = base.replace(/[^A-Za-z0-9 _-]+/g, '_');
  base = base.replace(/\s+/g, '-');
  base = base.slice(0, 60);
  if (base.length === 0) {
    base = 'circuit';
  }
  const ext = extension.startsWith('.') ? extension.slice(1) : extension;
  return `${base}.${ext}`;
}
