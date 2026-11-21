import type { ComponentDefinition } from '@/engine';

interface PaletteItemProps {
  definition: ComponentDefinition;
}

export function PaletteItem({ definition }: PaletteItemProps) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/x-logic-component', definition.type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      title="Drag onto the canvas"
      className="px-2.5 py-1.5 text-xs font-medium rounded border border-border bg-surface text-text hover:bg-surface-2 hover:border-border cursor-grab active:cursor-grabbing select-none transition-colors"
    >
      {definition.label}
    </div>
  );
}
