import { Panel } from '@/components/Panel';
import { listComponentDefinitions } from '@/engine';
import { templates } from '@/model';
import { PaletteItem } from './PaletteItem';
import { TemplateItem } from './TemplateItem';

export function Palette() {
  const ioComponents = listComponentDefinitions('io');
  const gateComponents = listComponentDefinitions('gate');

  return (
    <Panel title="Components">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-text-muted px-1">Input / Output</h3>
          <div className="flex flex-col gap-1">
            {ioComponents.map((def) => (
              <PaletteItem key={def.type} definition={def} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-text-muted px-1">Logic Gates</h3>
          <div className="flex flex-col gap-1">
            {gateComponents.map((def) => (
              <PaletteItem key={def.type} definition={def} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-text-muted px-1">Templates</h3>
          <p className="text-[11px] text-text-muted px-1 leading-snug">
            Built from gates. Drop one, then explore or edit it.
          </p>
          <div className="flex flex-col gap-1">
            {templates.map((tpl) => (
              <TemplateItem key={tpl.id} template={tpl} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-text-muted px-1">Combinational</h3>
          <div className="px-2.5 py-1.5 text-xs rounded border border-border/40 bg-surface-2/40 text-text-muted/60 select-none cursor-not-allowed">
            Coming later
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-text-muted px-1">Sequential</h3>
          <div className="px-2.5 py-1.5 text-xs rounded border border-border/40 bg-surface-2/40 text-text-muted/60 select-none cursor-not-allowed">
            Coming later
          </div>
        </div>
      </div>
    </Panel>
  );
}
