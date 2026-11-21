import { memo } from 'react';
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { selectWireValue, useSimStore } from '@/store';

export const SignalEdge = memo(function SignalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected = false,
  interactionWidth = 20,
}: EdgeProps) {
  const signal = useSimStore(selectWireValue(id));
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const strokeColor = selected
    ? 'var(--color-accent)'
    : signal === 1
      ? 'var(--color-signal-high)'
      : 'var(--color-signal-low)';

  const strokeWidth = signal === 1 ? 3 : 2;

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      interactionWidth={interactionWidth}
      style={{
        stroke: strokeColor,
        strokeWidth,
        transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
      }}
    />
  );
});
