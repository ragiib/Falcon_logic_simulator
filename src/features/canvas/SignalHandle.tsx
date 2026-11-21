import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { PinDirection } from '@/engine';
import { selectInputValue, selectPinValue, useSimStore } from '@/store';

export interface SignalHandleProps {
  componentId: string;
  pinId: string;
  direction: PinDirection;
  position: Position;
  top: string;
}

export const SignalHandle = memo(function SignalHandle({
  componentId,
  pinId,
  direction,
  position,
  top,
}: SignalHandleProps) {
  const signal = useSimStore(
    direction === 'output'
      ? selectPinValue(componentId, pinId)
      : selectInputValue(componentId, pinId),
  );

  const bgClass = signal === 1 ? '!bg-signal-high' : '!bg-signal-low';

  return (
    <Handle
      type={direction === 'output' ? 'source' : 'target'}
      position={position}
      id={pinId}
      isConnectable={true}
      style={{ top }}
      className={`!w-5 !h-5 !rounded-full !border-[5px] !border-solid !border-transparent !bg-clip-padding ${bgClass} hover:!bg-accent transition-colors cursor-crosshair`}
    />
  );
});
