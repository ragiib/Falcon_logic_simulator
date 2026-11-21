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
  warning?: boolean;
  title?: string;
}

export const SignalHandle = memo(function SignalHandle({
  componentId,
  pinId,
  direction,
  position,
  top,
  warning = false,
  title,
}: SignalHandleProps) {
  const signal = useSimStore(
    direction === 'output'
      ? selectPinValue(componentId, pinId)
      : selectInputValue(componentId, pinId),
  );

  const isUnconnectedInput = warning && direction === 'input';

  const visualClass = isUnconnectedInput
    ? '!bg-surface-2 shadow-[inset_0_0_0_1.5px_var(--color-warning)]'
    : signal === 1
      ? '!bg-signal-high'
      : '!bg-signal-low';

  return (
    <Handle
      type={direction === 'output' ? 'source' : 'target'}
      position={position}
      id={pinId}
      isConnectable={true}
      style={{ top }}
      title={title}
      className={`!w-5 !h-5 !rounded-full !border-[5px] !border-solid !border-transparent !bg-clip-padding ${visualClass} hover:!bg-accent hover:shadow-none transition-colors cursor-crosshair`}
    />
  );
});
