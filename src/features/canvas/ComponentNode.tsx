import { memo, useEffect } from 'react';
import { Position, useUpdateNodeInternals } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { selectInputValue, selectPinValue, useCircuitStore, useSimStore } from '@/store';
import { getComponentDefinition } from '@/engine';
import { SignalHandle } from './SignalHandle';
import { useCircuitWarnings } from './useCircuitWarnings';
import { isGateType, pinY } from './gateShapes';
import type { GateType } from './gateShapes';
import { getNodeSize } from './nodeGeometry';
import { getBlockTitle } from './blockLabels';
import { GateBody } from './GateBody';
import { SwitchBody } from './SwitchBody';
import { LedBody } from './LedBody';
import { ClockBody } from './ClockBody';

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
  const toggleClock = useCircuitStore((state) => state.toggleClock);
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

  const { width, height } = component
    ? getNodeSize(component.type, inputCount, outputCount)
    : { width: 96, height: 56 };

  useEffect(() => {
    updateNodeInternals(data.componentId);
  }, [data.componentId, inputCount, outputCount, height, updateNodeInternals]);

  if (!component || !definition) {
    return (
      <div className="w-24 p-2 rounded border border-danger bg-surface text-danger text-xs text-center font-medium">
        Unknown component
      </div>
    );
  }

  const isGate = isGateType(component.type);
  const isSwitch = component.type === 'inputSwitch';
  const isClock = component.type === 'clock';
  const isLed = component.type === 'outputLed';
  const isGeneric = !isGate && !isSwitch && !isLed && !isClock;
  const blockTitle = isGeneric ? getBlockTitle(component.type, component.params) : null;

  let containerClass: string;
  if (isGate) {
    containerClass = `relative flex items-center justify-center select-none ${
      selected ? 'rounded outline outline-1 outline-offset-2 outline-accent/50' : ''
    }`;
  } else if (isSwitch || isClock) {
    containerClass = `relative rounded-md border flex flex-col items-center justify-center bg-surface-2 text-text select-none transition-colors ${
      selected ? 'border-accent ring-1 ring-accent' : 'border-border'
    }`;
  } else if (isLed) {
    containerClass = `relative rounded-lg border flex flex-col items-center justify-center bg-surface-2 text-text select-none transition-colors ${
      selected ? 'border-accent ring-1 ring-accent' : 'border-border'
    }`;
  } else {
    const isGateWithHighOutput = definition.category === 'gate' && outSignal === 1;
    const borderClass = selected
      ? 'border-accent ring-1 ring-accent'
      : isGateWithHighOutput
        ? 'border-signal-high'
        : 'border-border hover:border-border';
    containerClass = `relative rounded-md border flex flex-col items-center justify-center bg-surface-2 text-text select-none transition-colors ${borderClass}`;
  }

  return (
    <div style={{ width, height }} className={containerClass}>
      {/* Warning marker in top-right corner */}
      {hasWarnings && (
        <span
          title={warningTooltip}
          className="absolute top-1 right-1.5 z-10 text-warning text-xs font-bold leading-none pointer-events-auto cursor-help select-none"
        >
          ⚠
        </span>
      )}

      {/* Input Handles and Labels */}
      {inputPins.map((pin, i) => {
        const topPx = pinY(i, inputCount, height);
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
              top={`${topPx}px`}
              warning={isUnconnected}
              title={pin.label}
            />
            {isGeneric && (
              <span
                className="absolute left-2 -translate-y-1/2 text-[10px] text-text-muted font-mono leading-none select-none pointer-events-none"
                style={{ top: `${topPx}px` }}
              >
                {pin.label}
              </span>
            )}
          </div>
        );
      })}

      {/* Output Handles and Labels */}
      {outputPins.map((pin, i) => {
        const topPx = pinY(i, outputCount, height);
        return (
          <div key={pin.id}>
            <SignalHandle
              componentId={component.id}
              pinId={pin.id}
              direction="output"
              position={Position.Right}
              top={`${topPx}px`}
              title={pin.label}
            />
            {isGeneric && (
              <span
                className="absolute right-2 -translate-y-1/2 text-[10px] text-text-muted font-mono leading-none select-none pointer-events-none"
                style={{ top: `${topPx}px` }}
              >
                {pin.label}
              </span>
            )}
          </div>
        );
      })}

      {/* Center Content */}
      {isGate ? (
        <GateBody
          type={component.type as GateType}
          width={width}
          height={height}
          inputCount={inputCount}
          active={outSignal === 1}
          selected={selected}
        />
      ) : isSwitch ? (
        <SwitchBody
          label={component.label}
          value={component.params['value'] === true}
          onToggle={() => toggleInputSwitch(component.id)}
        />
      ) : isClock ? (
        <ClockBody
          label={component.label}
          value={component.params['value'] === true}
          onToggle={() => toggleClock(component.id)}
        />
      ) : isLed ? (
        <LedBody lit={ledSignal === 1} label={component.label} />
      ) : blockTitle ? (
        <div className="flex flex-col items-center justify-center gap-0.5 max-w-[56px]">
          <span className="text-xs font-bold tracking-wider truncate text-center">
            {blockTitle.title}
          </span>
          <span className="text-[10px] text-text-muted truncate text-center leading-none">
            {blockTitle.subtitle}
          </span>
          {component.label && (
            <span className="text-[10px] text-text-muted truncate max-w-[56px] text-center">
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
