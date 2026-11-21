import { memo } from 'react';
import { getGateGeometry, pinY } from './gateShapes';
import type { GateType } from './gateShapes';

export interface GateSymbolProps {
  type: GateType;
  width: number;
  height: number;
  inputCount: number;
  active?: boolean;
  selected?: boolean;
  showLabel?: boolean;
  strokeWidth?: number;
}

export const GateSymbol = memo(function GateSymbol({
  type,
  width,
  height,
  inputCount,
  active = false,
  selected = false,
  showLabel = true,
  strokeWidth = 2,
}: GateSymbolProps) {
  const geom = getGateGeometry(type, width, height);

  const strokeColor = selected
    ? 'var(--color-accent)'
    : active
      ? 'var(--color-signal-high)'
      : 'var(--color-text-muted)';

  const inputLeads = Array.from({ length: inputCount }, (_, i) => {
    const y = pinY(i, inputCount, height);
    return (
      <line
        key={i}
        x1={0}
        y1={y}
        x2={geom.leadEndX}
        y2={y}
        stroke="var(--color-text-muted)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    );
  });

  return (
    <svg width={width} height={height} className="block overflow-visible" aria-hidden="true">
      {/* 1. Input leads */}
      {inputLeads}

      {/* 2. Body path */}
      <path
        d={geom.bodyPath}
        fill="var(--color-surface-2)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 3. Back curve path (if any) */}
      {geom.backCurvePath && (
        <path
          d={geom.backCurvePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* 4. Bubble (if any) */}
      {geom.bubble && (
        <circle
          cx={geom.bubble.cx}
          cy={geom.bubble.cy}
          r={geom.bubble.r}
          fill="var(--color-surface-2)"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )}

      {/* 5. Output lead */}
      <line
        x1={geom.outputStartX}
        y1={geom.midY}
        x2={width}
        y2={geom.midY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* 6. Label */}
      {showLabel && (
        <text
          x={geom.labelX}
          y={geom.midY}
          fontSize={9}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--color-text-muted)"
          pointerEvents="none"
          className="select-none font-bold tracking-wider"
        >
          {type.toUpperCase()}
        </text>
      )}
    </svg>
  );
});
