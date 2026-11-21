import { memo, useEffect } from 'react';
import { Position, useUpdateNodeInternals } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { selectInputValue, selectPinValue, useCircuitStore, useSimStore } from '@/store';
import { getComponentDefinition } from '@/engine';
import { SignalHandle } from './SignalHandle';
import { useCircuitWarnings } from './useCircuitWarnings';

export type ComponentNodeData = {
  componentId: string;
};

export type ComponentNodeType = Node<ComponentNodeData, 'component'>;

export const ComponentNode = memo(function ComponentNode({
  data,
  selected = false,
}: NodeProps<ComponentNodeType>) {
  const component = useCircuitStore((state) =>
    state.circuit.components.find((c) => c.id === data.componentId),
  );
  const toggleInputSwitch = useCircuitStore((state) => state.toggleInputSwitch);
  const updateNodeInternals = useUpdateNodeInternals();

  const definition = component ? getComponentDefinition(component.type) : undefined;
  const pins = definition && component ? definition.getPins(component.params) : [];
  const inputPins = pins.filter((p) => p.direction === 'input');
  const outputPins = pins.filter((p) => p.direction === 'output');
  const inputCount = inputPins.length;
  const outputCount = outputPins.length;

  // Live signal subscriptions
  const outSignal = useSimStore(selectPinValue(data.componentId, 'out'));
  const ledSignal = useSimStore(selectInputValue(data.componentId, 'in'));

  // Warnings for this component
  const { byComponent } = useCircuitWarnings();
  const compWarnings = byComponent[data.componentId] ?? [];
  const hasWarnings = compWarnings.length > 0;
  const warningTooltip = hasWarnings ? compWarnings.map((w) => w.message).join('\n') : undefined;

  useEffect(() => {
    updateNodeInternals(data.componentId);
  }, [data.componentId, inputCount, outputCount, updateNodeInternals]);

  if (!component || !definition) {
    return (
      <div className="w-24 p-2 rounded border border-danger bg-surface text-danger text-xs text-center font-medium">
        Unknown component
      </div>
    );
  }

  const height = Math.max(56, 28 * Math.max(inputCount, outputCount) + 16);
  const isGateWithHighOutput = definition.category === 'gate' && outSignal === 1;
  const borderClass = selected
    ? 'border-accent ring-1 ring-accent'
    : isGateWithHighOutput
      ? 'border-signal-high'
      : 'border-border hover:border-border';

  return (
    <div
      style={{ width: 96, height }}
      className={`relative rounded-md border flex flex-col items-center justify-center bg-surface-2 text-text select-none transition-colors ${borderClass}`}
    >
      {/* Warning marker in top-right corner */}
      {hasWarnings && (
        <span
          title={warningTooltip}
          className="absolute top-1 right-1.5 text-warning text-xs font-bold leading-none pointer-events-auto cursor-help select-none"
        >
          ⚠
        </span>
      )}

      {/* Input Handles and Labels */}
      {inputPins.map((pin, i) => {
        const top = `${((i + 1) / (inputCount + 1)) * 100}%`;
        const isUnconnected = compWarnings.some(
          (w) => w.kind === 'unconnectedInput' && w.pinId === pin.id,
        );
        return (
          <div key={pin.id}>
            <SignalHandle
              componentId={component.id}
              pinId={pin.id}
              direction="input"
              position={Position.Left}
              top={top}
              warning={isUnconnected}
            />
            <span
              className="absolute left-2 -translate-y-1/2 text-[10px] text-text-muted font-mono leading-none select-none pointer-events-none"
              style={{ top }}
            >
              {pin.label}
            </span>
          </div>
        );
      })}

      {/* Output Handles and Labels */}
      {outputPins.map((pin, i) => {
        const top = `${((i + 1) / (outputCount + 1)) * 100}%`;
        return (
          <div key={pin.id}>
            <SignalHandle
              componentId={component.id}
              pinId={pin.id}
              direction="output"
              position={Position.Right}
              top={top}
            />
            <span
              className="absolute right-2 -translate-y-1/2 text-[10px] text-text-muted font-mono leading-none select-none pointer-events-none"
              style={{ top }}
            >
              {pin.label}
            </span>
          </div>
        );
      })}

      {/* Center Content */}
      {component.type === 'inputSwitch' ? (
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-xs font-semibold leading-none">SW</span>
          {component.label && (
            <span className="text-[10px] text-text-muted truncate max-w-[70px] leading-tight">
              {component.label}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleInputSwitch(component.id);
            }}
            aria-pressed={component.params['value'] === true}
            aria-label="Toggle input switch"
            className={`nodrag nopan w-6 h-5 rounded border border-border flex items-center justify-center text-[10px] font-mono font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              component.params['value'] ? 'bg-signal-high text-white' : 'bg-signal-low text-white'
            }`}
          >
            {component.params['value'] ? '1' : '0'}
          </button>
        </div>
      ) : component.type === 'outputLed' ? (
        <div className="flex flex-col items-center justify-center gap-1">
          <div
            className={`w-4 h-4 rounded-full transition-all ${
              ledSignal === 1
                ? 'bg-signal-high shadow-[0_0_10px_var(--color-signal-high)] ring-2 ring-signal-high/40'
                : 'bg-signal-low shadow-xs'
            }`}
          />
          {component.label && (
            <span className="text-[10px] text-text-muted truncate max-w-[70px]">
              {component.label}
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-sm font-bold tracking-wider">{definition.label}</span>
          {component.label && (
            <span className="text-[10px] text-text-muted truncate max-w-[70px]">
              {component.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
