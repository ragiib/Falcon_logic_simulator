import React, { useCallback, useMemo } from 'react';
import type { Signal } from '@/engine';
import { truthTableKey } from '@/model';
import { downloadTextFile, sanitizeFileName } from '@/lib';
import { useCircuitStore, useToastStore, useTruthTableStore } from '@/store';
import { ToolbarButton } from '@/components/ToolbarButton';
import { currentRowIndex, rowToSwitchValues } from './currentRow';
import { truthTableToCsv } from './toCsv';

interface TruthTableRowViewProps {
  rowIndex: number;
  inputs: Signal[];
  outputs: Signal[];
  isHighlighted: boolean;
  isOutOfDate: boolean;
  onRowClick: (rowIndex: number) => void;
}

const TruthTableRowView = React.memo(function TruthTableRowView({
  rowIndex,
  inputs,
  outputs,
  isHighlighted,
  isOutOfDate,
  onRowClick,
}: TruthTableRowViewProps) {
  const rowClass = isHighlighted
    ? 'bg-accent/20 cursor-pointer'
    : isOutOfDate
      ? 'hover:bg-surface-2 cursor-not-allowed opacity-80'
      : 'hover:bg-surface-2 cursor-pointer';

  const rowTitle = isOutOfDate
    ? 'The circuit changed since this table was generated. Press Regenerate.'
    : 'Click to set the input switches to this row';

  return (
    <tr
      className={`border-b border-border/40 transition-colors ${rowClass}`}
      aria-selected={isHighlighted}
      title={rowTitle}
      onClick={() => {
        if (!isOutOfDate) {
          onRowClick(rowIndex);
        }
      }}
    >
      {inputs.map((val, i) => (
        <td key={i} className="px-3 py-1 text-text">
          {val}
        </td>
      ))}
      {outputs.map((val, i) => (
        <td
          key={i}
          className={`px-3 py-1 ${i === 0 ? 'border-l border-border' : ''} ${
            val === 1 ? 'text-signal-high font-semibold' : 'text-text-muted'
          }`}
        >
          {val}
        </td>
      ))}
    </tr>
  );
});

export function TruthTablePanel() {
  const circuit = useCircuitStore((state) => state.circuit);
  const setComponentParam = useCircuitStore((state) => state.setComponentParam);

  const result = useTruthTableStore((state) => state.result);
  const generatedKey = useTruthTableStore((state) => state.generatedKey);
  const generate = useTruthTableStore((state) => state.generate);
  const pushToast = useToastStore((state) => state.pushToast);

  const currentKey = useMemo(() => truthTableKey(circuit), [circuit]);
  const isOutOfDate = result !== null && currentKey !== generatedKey;

  const highlightedIndex = useMemo(() => {
    if (!result || !result.ok || isOutOfDate) {
      return null;
    }
    return currentRowIndex(result.inputs, circuit);
  }, [result, isOutOfDate, circuit]);

  const handleGenerate = () => {
    generate(circuit);
  };

  const handleExportCsv = () => {
    if (!result || !result.ok) return;
    const fileName = sanitizeFileName(`${circuit.name} truth table`, 'csv');
    const csv = truthTableToCsv(result);
    downloadTextFile(fileName, csv, 'text/csv');
    pushToast('success', `Exported ${fileName}`);
  };

  const handleRowClick = useCallback(
    (rowIndex: number) => {
      if (!result || !result.ok) return;
      const switchValues = rowToSwitchValues(result.inputs, rowIndex);
      for (const item of switchValues) {
        setComponentParam(item.componentId, 'value', item.value);
      }
    },
    [result, setComponentParam],
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-surface select-none">
      {/* Header Controls Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border gap-3 flex-none flex-wrap">
        <div className="flex items-center gap-2">
          <ToolbarButton onClick={handleGenerate}>
            {result !== null ? 'Regenerate' : 'Generate'}
          </ToolbarButton>
          <ToolbarButton
            onClick={handleExportCsv}
            disabled={!result || !result.ok}
            title={
              result && result.ok
                ? 'Export truth table to CSV'
                : 'Generate a truth table first to export'
            }
          >
            Export CSV
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-2">
          {result === null ? (
            <span className="text-xs text-text-muted">
              Press Generate to build the truth table for the current circuit.
            </span>
          ) : isOutOfDate ? (
            <span
              role="status"
              title="The circuit changed since this table was generated. Press Regenerate."
              className="inline-flex items-center px-2 py-0.5 rounded border border-warning text-warning text-xs font-medium cursor-default"
            >
              Out of date
            </span>
          ) : result.ok ? (
            <span className="text-xs text-text-muted">
              {result.rows.length} rows · {result.inputs.length} inputs · {result.outputs.length}{' '}
              outputs
            </span>
          ) : null}
        </div>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {result === null ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-text-muted">No truth table generated yet.</p>
          </div>
        ) : !result.ok ? (
          <div className="p-4 rounded border border-warning/40 bg-warning/10 text-xs text-warning max-w-xl mx-auto my-4 font-medium">
            <p>{result.message}</p>
          </div>
        ) : (
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="sticky top-0 bg-surface z-10 border-b border-border">
                {result.inputs.map((col) => (
                  <th
                    key={col.componentId}
                    title={col.name}
                    className="px-3 py-1.5 font-semibold text-text truncate max-w-[120px]"
                  >
                    {col.name}
                  </th>
                ))}
                {result.outputs.map((col, idx) => (
                  <th
                    key={col.componentId}
                    title={col.name}
                    className={`px-3 py-1.5 font-semibold text-text truncate max-w-[120px] ${
                      idx === 0 ? 'border-l border-border' : ''
                    }`}
                  >
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, rIdx) => (
                <TruthTableRowView
                  key={rIdx}
                  rowIndex={rIdx}
                  inputs={row.inputs}
                  outputs={row.outputs}
                  isHighlighted={rIdx === highlightedIndex}
                  isOutOfDate={isOutOfDate}
                  onRowClick={handleRowClick}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
