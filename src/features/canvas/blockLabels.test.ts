import { describe, expect, it } from 'vitest';
import { getBlockTitle } from './blockLabels';

describe('blockLabels', () => {
  it('returns correct title and subtitle for mux', () => {
    expect(getBlockTitle('mux', { selectBits: 1 })).toEqual({
      title: 'MUX',
      subtitle: '2:1',
    });
    expect(getBlockTitle('mux', { selectBits: 2 })).toEqual({
      title: 'MUX',
      subtitle: '4:1',
    });
    expect(getBlockTitle('mux', { selectBits: 3 })).toEqual({
      title: 'MUX',
      subtitle: '8:1',
    });
  });

  it('returns correct title and subtitle for demux', () => {
    expect(getBlockTitle('demux', { selectBits: 2 })).toEqual({
      title: 'DEMUX',
      subtitle: '1:4',
    });
  });

  it('returns correct title and subtitle for decoder', () => {
    expect(getBlockTitle('decoder', { bits: 2 })).toEqual({
      title: 'DEC',
      subtitle: '2:4',
    });
    expect(getBlockTitle('decoder', { bits: 3 })).toEqual({
      title: 'DEC',
      subtitle: '3:8',
    });
  });

  it('returns correct title and subtitle for priority encoder', () => {
    expect(getBlockTitle('priorityEncoder', { bits: 2 })).toEqual({
      title: 'ENC',
      subtitle: '4:2',
    });
    expect(getBlockTitle('priorityEncoder', { bits: 3 })).toEqual({
      title: 'ENC',
      subtitle: '8:3',
    });
  });

  it('returns correct title and subtitle for comparator', () => {
    expect(getBlockTitle('comparator', { bits: 1 })).toEqual({
      title: 'CMP',
      subtitle: '1-bit',
    });
    expect(getBlockTitle('comparator', { bits: 4 })).toEqual({
      title: 'CMP',
      subtitle: '4-bit',
    });
  });

  it('falls back to defaults for bad params', () => {
    expect(getBlockTitle('mux', { selectBits: 'bad' as unknown as number })).toEqual({
      title: 'MUX',
      subtitle: '2:1',
    });
    expect(getBlockTitle('mux', { selectBits: 99 })).toEqual({
      title: 'MUX',
      subtitle: '8:1',
    });
    expect(getBlockTitle('decoder', { bits: 0 })).toEqual({
      title: 'DEC',
      subtitle: '2:4',
    });
    expect(getBlockTitle('comparator', { bits: 100 })).toEqual({
      title: 'CMP',
      subtitle: '4-bit',
    });
  });

  it('returns correct title and subtitle for dff, srff, jkff, and tff', () => {
    expect(getBlockTitle('dff', { asyncControls: false })).toEqual({
      title: 'D FF',
      subtitle: 'rising edge',
    });
    expect(getBlockTitle('dff', { asyncControls: true })).toEqual({
      title: 'D FF',
      subtitle: 'PRE/CLR',
    });
    expect(getBlockTitle('srff', { asyncControls: false })).toEqual({
      title: 'SR FF',
      subtitle: 'rising edge',
    });
    expect(getBlockTitle('srff', { asyncControls: true })).toEqual({
      title: 'SR FF',
      subtitle: 'PRE/CLR',
    });
    expect(getBlockTitle('jkff', { asyncControls: false })).toEqual({
      title: 'JK FF',
      subtitle: 'rising edge',
    });
    expect(getBlockTitle('jkff', { asyncControls: true })).toEqual({
      title: 'JK FF',
      subtitle: 'PRE/CLR',
    });
    expect(getBlockTitle('tff', { asyncControls: false })).toEqual({
      title: 'T FF',
      subtitle: 'rising edge',
    });
    expect(getBlockTitle('tff', { asyncControls: true })).toEqual({
      title: 'T FF',
      subtitle: 'PRE/CLR',
    });
  });

  it('returns correct title and subtitle for register and shiftRegister', () => {
    expect(getBlockTitle('register', { bits: 4 })).toEqual({
      title: 'REG',
      subtitle: '4-bit',
    });
    expect(getBlockTitle('register', { bits: 8, loadEnable: true })).toEqual({
      title: 'REG',
      subtitle: '8-bit · load',
    });
    expect(getBlockTitle('register', { bits: 4, asyncClear: true })).toEqual({
      title: 'REG',
      subtitle: '4-bit · clr',
    });
    expect(getBlockTitle('register', { bits: 4, loadEnable: true, asyncClear: true })).toEqual({
      title: 'REG',
      subtitle: '4-bit · load · clr',
    });
    expect(getBlockTitle('shiftRegister', { bits: 4 })).toEqual({
      title: 'SHIFT',
      subtitle: '4-bit',
    });
    expect(getBlockTitle('shiftRegister', { bits: 6, asyncClear: true })).toEqual({
      title: 'SHIFT',
      subtitle: '6-bit · clr',
    });
  });

  it('falls back to defaults for bad params on sequential components', () => {
    expect(getBlockTitle('register', { bits: 99 })).toEqual({
      title: 'REG',
      subtitle: '8-bit',
    });
    expect(getBlockTitle('register', { bits: 0 })).toEqual({
      title: 'REG',
      subtitle: '1-bit',
    });
    expect(getBlockTitle('shiftRegister', { bits: 1 })).toEqual({
      title: 'SHIFT',
      subtitle: '2-bit',
    });
    expect(getBlockTitle('jkff', { asyncControls: 'bad' as unknown as boolean })).toEqual({
      title: 'JK FF',
      subtitle: 'rising edge',
    });
  });

  it('returns null for non-block or unknown types, including clock', () => {
    expect(getBlockTitle('and', {})).toBeNull();
    expect(getBlockTitle('inputSwitch', { value: true })).toBeNull();
    expect(getBlockTitle('clock', { value: true })).toBeNull();
    expect(getBlockTitle('outputLed', {})).toBeNull();
    expect(getBlockTitle('unknown', {})).toBeNull();
  });
});
