import type { ParamValues } from '@/engine';
import { readBooleanParam, readNumberParam } from '@/engine';

export function getBlockTitle(
  type: string,
  params: Readonly<ParamValues>,
): { title: string; subtitle: string } | null {
  switch (type) {
    case 'mux': {
      const k = readNumberParam(params, 'selectBits', 1, 1, 3);
      return { title: 'MUX', subtitle: `${1 << k}:1` };
    }
    case 'demux': {
      const k = readNumberParam(params, 'selectBits', 1, 1, 3);
      return { title: 'DEMUX', subtitle: `1:${1 << k}` };
    }
    case 'decoder': {
      const k = readNumberParam(params, 'bits', 2, 2, 3);
      return { title: 'DEC', subtitle: `${k}:${1 << k}` };
    }
    case 'priorityEncoder': {
      const k = readNumberParam(params, 'bits', 2, 2, 3);
      return { title: 'ENC', subtitle: `${1 << k}:${k}` };
    }
    case 'comparator': {
      const n = readNumberParam(params, 'bits', 1, 1, 4);
      return { title: 'CMP', subtitle: `${n}-bit` };
    }
    case 'dff': {
      const asyncControls = readBooleanParam(params, 'asyncControls', false);
      return {
        title: 'D FF',
        subtitle: asyncControls ? 'PRE/CLR' : 'rising edge',
      };
    }
    case 'srff': {
      const asyncControls = readBooleanParam(params, 'asyncControls', false);
      return {
        title: 'SR FF',
        subtitle: asyncControls ? 'PRE/CLR' : 'rising edge',
      };
    }
    case 'jkff': {
      const asyncControls = readBooleanParam(params, 'asyncControls', false);
      return {
        title: 'JK FF',
        subtitle: asyncControls ? 'PRE/CLR' : 'rising edge',
      };
    }
    case 'tff': {
      const asyncControls = readBooleanParam(params, 'asyncControls', false);
      return {
        title: 'T FF',
        subtitle: asyncControls ? 'PRE/CLR' : 'rising edge',
      };
    }
    case 'register': {
      const n = readNumberParam(params, 'bits', 4, 1, 8);
      const loadEnable = readBooleanParam(params, 'loadEnable', false);
      const asyncClear = readBooleanParam(params, 'asyncClear', false);
      let subtitle = `${n}-bit`;
      if (loadEnable) subtitle += ' · load';
      if (asyncClear) subtitle += ' · clr';
      return { title: 'REG', subtitle };
    }
    case 'shiftRegister': {
      const n = readNumberParam(params, 'bits', 4, 2, 8);
      const asyncClear = readBooleanParam(params, 'asyncClear', false);
      let subtitle = `${n}-bit`;
      if (asyncClear) subtitle += ' · clr';
      return { title: 'SHIFT', subtitle };
    }
    default:
      return null;
  }
}
