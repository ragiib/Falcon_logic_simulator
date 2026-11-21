import type { TruthTableResult } from '@/engine';

function escapeCsvCell(cell: string): string {
  let val = cell;
  if (/^[=+\-@]/.test(val)) {
    val = `'${val}`;
  }
  if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
    val = `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Serializes an ok TruthTableResult to CSV format.
 * Lines are separated by \r\n with a trailing \r\n.
 */
export function truthTableToCsv(result: Extract<TruthTableResult, { ok: true }>): string {
  const headerCells = [
    ...result.inputs.map((c) => escapeCsvCell(c.name)),
    ...result.outputs.map((c) => escapeCsvCell(c.name)),
  ];
  const headerLine = headerCells.join(',');

  const bodyLines = result.rows.map((row) => {
    const rowValues = [...row.inputs, ...row.outputs].map(String);
    return rowValues.join(',');
  });

  return `${[headerLine, ...bodyLines].join('\r\n')}\r\n`;
}
