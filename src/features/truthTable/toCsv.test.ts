import { describe, expect, it } from 'vitest';
import type { TruthTableResult } from '@/engine';
import { truthTableToCsv } from './toCsv';

describe('truthTableToCsv', () => {
  it('simple 2-input AND table gives header IN1,IN2,OUT1 and 4 lines with \\r\\n and trailing \\r\\n', () => {
    const result: Extract<TruthTableResult, { ok: true }> = {
      ok: true,
      inputs: [
        { componentId: 'sw1', name: 'IN1' },
        { componentId: 'sw2', name: 'IN2' },
      ],
      outputs: [{ componentId: 'led1', name: 'OUT1' }],
      rows: [
        { inputs: [0, 0], outputs: [0] },
        { inputs: [0, 1], outputs: [0] },
        { inputs: [1, 0], outputs: [0] },
        { inputs: [1, 1], outputs: [1] },
      ],
    };

    const csv = truthTableToCsv(result);
    const expected = 'IN1,IN2,OUT1\r\n' + '0,0,0\r\n' + '0,1,0\r\n' + '1,0,0\r\n' + '1,1,1\r\n';

    expect(csv).toBe(expected);
  });

  it('escapes and quotes names with commas, quotes, and newlines correctly', () => {
    const result: Extract<TruthTableResult, { ok: true }> = {
      ok: true,
      inputs: [
        { componentId: 'sw1', name: 'A,B' },
        { componentId: 'sw2', name: 'Quote "Test"' },
      ],
      outputs: [{ componentId: 'led1', name: 'Line\nBreak' }],
      rows: [{ inputs: [0, 1], outputs: [1] }],
    };

    const csv = truthTableToCsv(result);
    const expected = '"A,B","Quote ""Test""","Line\nBreak"\r\n' + '0,1,1\r\n';

    expect(csv).toBe(expected);
  });

  it('prefixes names starting with =, +, -, or @ with a single quote to prevent spreadsheet injection', () => {
    const result: Extract<TruthTableResult, { ok: true }> = {
      ok: true,
      inputs: [
        { componentId: 'sw1', name: '=SUM(1,2)' },
        { componentId: 'sw2', name: '+10' },
      ],
      outputs: [
        { componentId: 'led1', name: '-MINUS' },
        { componentId: 'led2', name: '@AT' },
      ],
      rows: [{ inputs: [1, 1], outputs: [0, 0] }],
    };

    const csv = truthTableToCsv(result);
    // Notice =SUM(1,2) contains a comma, so after '=SUM(1,2) it gets quoted as "'=SUM(1,2)"
    expect(csv).toContain('"\'=SUM(1,2)"');
    expect(csv).toContain("'+10");
    expect(csv).toContain("'-MINUS");
    expect(csv).toContain("'@AT");
  });
});
