import { useCallback, useMemo } from 'react';
import { Background, Controls, ReactFlow, useReactFlow } from '@xyflow/react';
import type {
  DefaultEdgeOptions,
  EdgeTypes,
  IsValidConnection,
  NodeTypes,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCircuitStore, useUiStore } from '@/store';
import { validateConnection } from '@/model';
import { ComponentNode } from './ComponentNode';
import { SignalEdge } from './SignalEdge';
import { SimStatusBanner } from './SimStatusBanner';
import { WarningsPanel } from './WarningsPanel';
import { useCanvasShortcuts } from './useCanvasShortcuts';

const nodeTypes: NodeTypes = {
  component: ComponentNode,
};

const edgeTypes: EdgeTypes = {
  signal: SignalEdge,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  interactionWidth: 20,
};

export function CanvasArea() {
  useCanvasShortcuts();

  const theme = useUiStore((state) => state.theme);
  const selectedIds = useUiStore((state) => state.selectedIds);
  const setSelectedIds = useUiStore((state) => state.setSelectedIds);
  const selectedWireIds = useUiStore((state) => state.selectedWireIds);
  const setSelectedWireIds = useUiStore((state) => state.setSelectedWireIds);

  const circuit = useCircuitStore((state) => state.circuit);
  const addComponent = useCircuitStore((state) => state.addComponent);
  const setPositions = useCircuitStore((state) => state.setPositions);
  const removeComponents = useCircuitStore((state) => state.removeComponents);
  const addWire = useCircuitStore((state) => state.addWire);
  const removeWires = useCircuitStore((state) => state.removeWires);

  const { screenToFlowPosition } = useReactFlow();

  const nodes = useMemo(
    () =>
      circuit.components.map((c) => ({
        id: c.id,
        type: 'component',
        position: c.position,
        data: { componentId: c.id },
        selected: selectedIds.includes(c.id),
      })),
    [circuit.components, selectedIds],
  );

  const edges = useMemo(
    () =>
      circuit.wires.map((w) => ({
        id: w.id,
        source: w.from.componentId,
        sourceHandle: w.from.pinId,
        target: w.to.componentId,
        targetHandle: w.to.pinId,
        type: 'signal',
        selected: selectedWireIds.includes(w.id),
        interactionWidth: 20,
      })),
    [circuit.wires, selectedWireIds],
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const positionsBatch: Record<string, { x: number; y: number }> = {};
      const removedIds: string[] = [];

      for (const change of changes.getByType('position')) {
        if (change.position) {
          positionsBatch[change.id] = change.position;
        }
      }

      for (const change of changes.getByType('remove')) {
        removedIds.push(change.id);
      }

      const selectChanges = changes.getByType('select');

      if (Object.keys(positionsBatch).length > 0) {
        setPositions(positionsBatch);
      }

      if (removedIds.length > 0) {
        removeComponents(removedIds);
        const removedSet = new Set(removedIds);
        setSelectedIds(selectedIds.filter((id) => !removedSet.has(id)));

        // Clean up any selected wires that touched the removed components
        const remainingWires = useCircuitStore.getState().circuit.wires;
        const remainingWireIds = new Set(remainingWires.map((w) => w.id));
        setSelectedWireIds(selectedWireIds.filter((id) => remainingWireIds.has(id)));
      }

      if (selectChanges.length > 0) {
        const currentSelected = new Set(selectedIds);
        for (const sc of selectChanges) {
          if (sc.selected) {
            currentSelected.add(sc.id);
          } else {
            currentSelected.delete(sc.id);
          }
        }
        setSelectedIds(Array.from(currentSelected));
      }
    },
    [
      selectedIds,
      selectedWireIds,
      setPositions,
      removeComponents,
      setSelectedIds,
      setSelectedWireIds,
    ],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const removedEdgeIds: string[] = [];
      for (const change of changes.getByType('remove')) {
        removedEdgeIds.push(change.id);
      }

      const selectChanges = changes.getByType('select');

      if (removedEdgeIds.length > 0) {
        removeWires(removedEdgeIds);
        const removedSet = new Set(removedEdgeIds);
        setSelectedWireIds(selectedWireIds.filter((id) => !removedSet.has(id)));
      }

      if (selectChanges.length > 0) {
        const currentSelected = new Set(selectedWireIds);
        for (const sc of selectChanges) {
          if (sc.selected) {
            currentSelected.add(sc.id);
          } else {
            currentSelected.delete(sc.id);
          }
        }
        setSelectedWireIds(Array.from(currentSelected));
      }
    },
    [selectedWireIds, removeWires, setSelectedWireIds],
  );

  const isValidConnection: IsValidConnection = useCallback((connection) => {
    if (
      !connection.source ||
      !connection.target ||
      !connection.sourceHandle ||
      !connection.targetHandle
    ) {
      return false;
    }
    const currentCircuit = useCircuitStore.getState().circuit;
    const check = validateConnection(
      currentCircuit,
      { componentId: connection.source, pinId: connection.sourceHandle },
      { componentId: connection.target, pinId: connection.targetHandle },
    );
    return check.ok;
  }, []);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (
        !connection.source ||
        !connection.target ||
        !connection.sourceHandle ||
        !connection.targetHandle
      ) {
        return;
      }
      addWire(
        { componentId: connection.source, pinId: connection.sourceHandle },
        { componentId: connection.target, pinId: connection.targetHandle },
      );
    },
    [addWire],
  );

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/x-logic-component');
    if (!type) return;

    const flowPos = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const rawX = flowPos.x - 48;
    const rawY = flowPos.y - 28;
    const snappedX = Math.round(rawX / 16) * 16;
    const snappedY = Math.round(rawY / 16) * 16;

    const id = addComponent(type, { x: snappedX, y: snappedY });
    if (id) {
      setSelectedIds([id]);
    }
  };

  return (
    <div
      className="w-full h-full min-h-0 min-w-0 bg-bg relative overflow-hidden select-none"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <SimStatusBanner />
      <WarningsPanel />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodesConnectable={true}
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={['Backspace', 'Delete']}
        selectionOnDrag
        panOnDrag={[1, 2]}
        panOnScroll={false}
        minZoom={0.25}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        forceColorMode={theme}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>

      {circuit.components.length === 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <p className="text-sm text-text-muted select-none">
            Drag components from the palette onto the canvas
          </p>
        </div>
      )}
    </div>
  );
}
