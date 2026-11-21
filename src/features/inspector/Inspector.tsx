import { Panel } from '@/components/Panel';
import { useCircuitStore, useUiStore } from '@/store';
import { getComponentDefinition } from '@/engine';

export function Inspector() {
  const selectedIds = useUiStore((state) => state.selectedIds);
  const selectedWireIds = useUiStore((state) => state.selectedWireIds);
  const setSelectedIds = useUiStore((state) => state.setSelectedIds);
  const setSelectedWireIds = useUiStore((state) => state.setSelectedWireIds);

  const circuit = useCircuitStore((state) => state.circuit);
  const setComponentParam = useCircuitStore((state) => state.setComponentParam);
  const setComponentLabel = useCircuitStore((state) => state.setComponentLabel);
  const removeComponents = useCircuitStore((state) => state.removeComponents);
  const removeWires = useCircuitStore((state) => state.removeWires);

  const totalSelected = selectedIds.length + selectedWireIds.length;

  if (totalSelected === 0) {
    return (
      <Panel title="Inspector">
        <p className="text-xs text-text-muted">Select a component or wire to inspect.</p>
      </Panel>
    );
  }

  if (totalSelected > 1) {
    return (
      <Panel title="Inspector">
        <div className="nokey flex flex-col gap-3 text-xs">
          <div className="text-text font-medium">Multiple items selected</div>
          <div className="text-text-muted flex flex-col gap-1">
            {selectedIds.length > 0 && (
              <div>
                {selectedIds.length} {selectedIds.length === 1 ? 'component' : 'components'}
              </div>
            )}
            {selectedWireIds.length > 0 && (
              <div>
                {selectedWireIds.length} {selectedWireIds.length === 1 ? 'wire' : 'wires'}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (selectedIds.length > 0) removeComponents(selectedIds);
              if (selectedWireIds.length > 0) removeWires(selectedWireIds);
              setSelectedIds([]);
              setSelectedWireIds([]);
            }}
            className="mt-2 px-3 py-1.5 rounded border border-danger text-danger hover:bg-danger/10 text-xs font-medium cursor-pointer transition-colors"
          >
            Delete Selected
          </button>
        </div>
      </Panel>
    );
  }

  // Single wire selected
  if (selectedWireIds.length === 1 && selectedIds.length === 0) {
    const wireId = selectedWireIds[0]!;
    const wire = circuit.wires.find((w) => w.id === wireId);

    if (!wire) {
      return (
        <Panel title="Inspector">
          <p className="text-xs text-text-muted">Wire not found.</p>
        </Panel>
      );
    }

    const fromComp = circuit.components.find((c) => c.id === wire.from.componentId);
    const toComp = circuit.components.find((c) => c.id === wire.to.componentId);

    const fromDef = fromComp ? getComponentDefinition(fromComp.type) : undefined;
    const toDef = toComp ? getComponentDefinition(toComp.type) : undefined;

    const fromLabel = fromComp?.label
      ? `${fromDef?.label ?? fromComp.type} (${fromComp.label})`
      : (fromDef?.label ?? fromComp?.type ?? 'Unknown');

    const toLabel = toComp?.label
      ? `${toDef?.label ?? toComp.type} (${toComp.label})`
      : (toDef?.label ?? toComp?.type ?? 'Unknown');

    return (
      <Panel title="Inspector">
        <div className="nokey flex flex-col gap-4 text-xs">
          <div>
            <h3 className="font-semibold text-text text-sm">Wire</h3>
            <p className="text-[10px] text-text-muted font-mono">{wire.id}</p>
          </div>

          <div className="flex flex-col gap-2 rounded border border-border p-2 bg-surface-2">
            <div>
              <span className="text-text-muted block text-[10px] uppercase font-semibold">
                Source
              </span>
              <span className="text-text font-medium">
                {fromLabel} : <span className="font-mono text-accent">{wire.from.pinId}</span>
              </span>
            </div>
            <div className="text-text-muted text-center font-bold">↓</div>
            <div>
              <span className="text-text-muted block text-[10px] uppercase font-semibold">
                Destination
              </span>
              <span className="text-text font-medium">
                {toLabel} : <span className="font-mono text-accent">{wire.to.pinId}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              removeWires([wire.id]);
              setSelectedWireIds([]);
            }}
            className="mt-2 px-3 py-1.5 rounded border border-danger text-danger hover:bg-danger/10 text-xs font-medium cursor-pointer transition-colors"
          >
            Delete Wire
          </button>
        </div>
      </Panel>
    );
  }

  // Single component selected
  const componentId = selectedIds[0]!;
  const component = circuit.components.find((c) => c.id === componentId);

  if (!component) {
    return (
      <Panel title="Inspector">
        <p className="text-xs text-text-muted">Component not found.</p>
      </Panel>
    );
  }

  const definition = getComponentDefinition(component.type);
  if (!definition) {
    return (
      <Panel title="Inspector">
        <p className="text-xs text-danger font-medium">Unknown component type: {component.type}</p>
      </Panel>
    );
  }

  const pins = definition.getPins(component.params);
  const inputPins = pins.filter((p) => p.direction === 'input');
  const outputPins = pins.filter((p) => p.direction === 'output');

  return (
    <Panel title="Inspector">
      <div className="nokey flex flex-col gap-4 text-xs">
        {/* Header */}
        <div className="border-b border-border pb-2">
          <h3 className="font-semibold text-text text-sm">{definition.label}</h3>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted font-mono">
            <span>{component.type}</span>
            <span>•</span>
            <span>{component.id}</span>
          </div>
        </div>

        {/* Label (for IO components) */}
        {definition.category === 'io' && (
          <div className="flex flex-col gap-1">
            <label htmlFor="comp-label" className="text-text-muted font-medium text-[11px]">
              Label
            </label>
            <input
              id="comp-label"
              type="text"
              maxLength={16}
              placeholder="e.g. A, CLK, LED1"
              value={component.label ?? ''}
              onChange={(e) => setComponentLabel(component.id, e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="px-2 py-1 rounded border border-border bg-surface-2 text-text text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent placeholder:text-text-muted/50"
            />
          </div>
        )}

        {/* Parameters */}
        {definition.params.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-text-muted font-semibold text-[10px] uppercase tracking-wider">
              Parameters
            </span>
            {definition.params.map((param) => {
              const currentValue = component.params[param.id];

              if (param.type === 'number') {
                const numVal =
                  typeof currentValue === 'number' && Number.isFinite(currentValue)
                    ? currentValue
                    : (param.default as number);

                return (
                  <div key={param.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={`param-${param.id}`}
                        className="text-text-muted font-medium text-[11px]"
                      >
                        {param.label}
                      </label>
                      {param.min !== undefined && param.max !== undefined && (
                        <span className="text-[10px] text-text-muted">
                          [{param.min} – {param.max}]
                        </span>
                      )}
                    </div>
                    <input
                      id={`param-${param.id}`}
                      type="number"
                      min={param.min}
                      max={param.max}
                      step={1}
                      value={numVal}
                      onChange={(e) => {
                        const parsed = Number(e.target.value);
                        if (Number.isFinite(parsed)) {
                          setComponentParam(component.id, param.id, parsed);
                        }
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="px-2 py-1 rounded border border-border bg-surface-2 text-text text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    />
                  </div>
                );
              }

              if (param.type === 'boolean') {
                const boolVal = Boolean(currentValue);
                return (
                  <div key={param.id} className="flex items-center justify-between py-1">
                    <label
                      htmlFor={`param-${param.id}`}
                      className="text-text-muted font-medium text-[11px] cursor-pointer"
                    >
                      {param.label}
                    </label>
                    <input
                      id={`param-${param.id}`}
                      type="checkbox"
                      checked={boolVal}
                      onChange={(e) => {
                        setComponentParam(component.id, param.id, e.target.checked);
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="cursor-pointer accent-accent w-4 h-4 rounded"
                    />
                  </div>
                );
              }

              if (param.type === 'string') {
                const strVal = typeof currentValue === 'string' ? currentValue : '';
                return (
                  <div key={param.id} className="flex flex-col gap-1">
                    <label
                      htmlFor={`param-${param.id}`}
                      className="text-text-muted font-medium text-[11px]"
                    >
                      {param.label}
                    </label>
                    <input
                      id={`param-${param.id}`}
                      type="text"
                      value={strVal}
                      onChange={(e) => {
                        setComponentParam(component.id, param.id, e.target.value);
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="px-2 py-1 rounded border border-border bg-surface-2 text-text text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    />
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

        {/* Read-only Pins List */}
        <div className="flex flex-col gap-2">
          <span className="text-text-muted font-semibold text-[10px] uppercase tracking-wider">
            Pins ({pins.length})
          </span>
          <div className="rounded border border-border bg-surface-2 p-2 flex flex-col gap-2">
            {inputPins.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold text-text-muted uppercase block mb-1">
                  Inputs ({inputPins.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {inputPins.map((pin) => (
                    <span
                      key={pin.id}
                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono text-text"
                    >
                      {pin.label}
                      <span className="text-text-muted ml-1 font-sans">({pin.id})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {outputPins.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold text-text-muted uppercase block mb-1">
                  Outputs ({outputPins.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {outputPins.map((pin) => (
                    <span
                      key={pin.id}
                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono text-text"
                    >
                      {pin.label}
                      <span className="text-text-muted ml-1 font-sans">({pin.id})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Component Button */}
        <button
          type="button"
          onClick={() => {
            removeComponents([component.id]);
            setSelectedIds([]);
          }}
          className="mt-2 px-3 py-1.5 rounded border border-danger text-danger hover:bg-danger/10 text-xs font-medium cursor-pointer transition-colors"
        >
          Delete Component
        </button>
      </div>
    </Panel>
  );
}
