import type { TemplateDefinition } from '@/model';

interface TemplateItemProps {
  template: TemplateDefinition;
}

export function TemplateItem({ template }: TemplateItemProps) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/x-logic-template', template.id);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      title={template.description}
      className="px-2.5 py-1.5 text-xs font-medium rounded border border-border bg-surface text-text hover:bg-surface-2 hover:border-border cursor-grab active:cursor-grabbing select-none transition-colors"
    >
      <span>{template.name}</span>
    </div>
  );
}
