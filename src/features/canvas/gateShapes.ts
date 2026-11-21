export type GateType = 'and' | 'or' | 'not' | 'nand' | 'nor' | 'xor' | 'xnor';

const GATE_TYPES = new Set<string>(['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor']);

export function isGateType(type: string): type is GateType {
  return GATE_TYPES.has(type);
}

export function pinY(index: number, count: number, height: number): number {
  return ((index + 1) / (count + 1)) * height;
}

export interface GateGeometry {
  bodyPath: string; // closed, filled path
  backCurvePath: string | null; // open extra curve, only for xor / xnor
  bubble: { cx: number; cy: number; r: number } | null; // nand, nor, xnor, not
  bodyLeft: number;
  bodyRight: number; // right edge of the body BEFORE the bubble
  leadEndX: number; // x where input leads stop (they are drawn behind the body)
  outputStartX: number; // bubble ? cx + r : bodyRight
  midY: number; // height / 2
  labelX: number;
}

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

export function getGateGeometry(type: GateType, width: number, height: number): GateGeometry {
  const W = width;
  const lead = W * 0.125;
  const r = W * 0.05;
  const d = W * 0.15;
  const gap = W * 0.08;

  const pad = 3;
  const top = pad;
  const bottom = height - pad;
  const mid = height / 2;

  const x0 = lead;
  const isInverted = type === 'nand' || type === 'nor' || type === 'xnor' || type === 'not';

  const bodyRight = isInverted ? W - lead - 2 * r : W - lead;
  const bubble = isInverted ? { cx: bodyRight + r, cy: mid, r } : null;
  const outputStartX = bubble ? bubble.cx + bubble.r : bodyRight;

  let bodyPath: string;
  let backCurvePath: string | null = null;
  let bodyLeft = x0;
  let leadEndX: number;

  switch (type) {
    case 'and':
    case 'nand': {
      const rx = (bodyRight - x0) / 2;
      const ry = (bottom - top) / 2;
      const xm = bodyRight - rx;
      bodyPath = `M ${fmt(x0)} ${fmt(top)} H ${fmt(xm)} A ${fmt(rx)} ${fmt(ry)} 0 0 1 ${fmt(xm)} ${fmt(bottom)} H ${fmt(x0)} Z`;
      leadEndX = x0 + 4;
      break;
    }
    case 'or':
    case 'nor': {
      const cxT = x0 + (bodyRight - x0) * 0.6;
      bodyPath = `M ${fmt(x0)} ${fmt(top)} Q ${fmt(cxT)} ${fmt(top)} ${fmt(bodyRight)} ${fmt(mid)} Q ${fmt(cxT)} ${fmt(bottom)} ${fmt(x0)} ${fmt(bottom)} Q ${fmt(x0 + 2 * d)} ${fmt(mid)} ${fmt(x0)} ${fmt(top)} Z`;
      leadEndX = x0 + d;
      break;
    }
    case 'xor':
    case 'xnor': {
      const xb = x0 + gap;
      bodyLeft = xb;
      const cxT = xb + (bodyRight - xb) * 0.6;
      bodyPath = `M ${fmt(xb)} ${fmt(top)} Q ${fmt(cxT)} ${fmt(top)} ${fmt(bodyRight)} ${fmt(mid)} Q ${fmt(cxT)} ${fmt(bottom)} ${fmt(xb)} ${fmt(bottom)} Q ${fmt(xb + 2 * d)} ${fmt(mid)} ${fmt(xb)} ${fmt(top)} Z`;
      backCurvePath = `M ${fmt(x0)} ${fmt(top)} Q ${fmt(x0 + 2 * d)} ${fmt(mid)} ${fmt(x0)} ${fmt(bottom)}`;
      leadEndX = xb + d;
      break;
    }
    case 'not': {
      bodyPath = `M ${fmt(x0)} ${fmt(top)} L ${fmt(x0)} ${fmt(bottom)} L ${fmt(bodyRight)} ${fmt(mid)} Z`;
      leadEndX = x0 + 4;
      break;
    }
  }

  let labelX: number;
  if (type === 'not') {
    labelX = bodyLeft + (bodyRight - bodyLeft) * 0.3;
  } else if (type === 'or' || type === 'nor' || type === 'xor' || type === 'xnor') {
    labelX = bodyLeft + (bodyRight - bodyLeft) * 0.42 + d;
  } else {
    labelX = bodyLeft + (bodyRight - bodyLeft) * 0.42;
  }

  return {
    bodyPath,
    backCurvePath,
    bubble,
    bodyLeft,
    bodyRight,
    leadEndX,
    outputStartX,
    midY: mid,
    labelX,
  };
}
