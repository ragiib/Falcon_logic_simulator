import { memo } from 'react';
import type { GateType } from './gateShapes';
import { GateSymbol } from './GateSymbol';

export interface GateBodyProps {
  type: GateType;
  width: number;
  height: number;
  inputCount: number;
  active: boolean;
  selected: boolean;
}

export const GateBody = memo(function GateBody({
  type,
  width,
  height,
  inputCount,
  active,
  selected,
}: GateBodyProps) {
  return (
    <GateSymbol
      type={type}
      width={width}
      height={height}
      inputCount={inputCount}
      active={active}
      selected={selected}
    />
  );
});
