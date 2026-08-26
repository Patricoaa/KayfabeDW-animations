'use client';

import type {ChartConfig, ChartType} from '@/lib/chart-config';

type ChartConfigPanelProps = {
  config: ChartConfig;
  onChange: (config: ChartConfig) => void;
  columns: string[];
};

const CHART_TYPES: {type: ChartType; label: string; icon: string}[] = [
  {type: 'bar', label: 'Barras', icon: '📊'},
  {type: 'pie', label: 'Pie', icon: '🥧'},
  {type: 'line', label: 'Líneas', icon: '📈'},
  {type: 'area', label: 'Área', icon: '📉'},
  {type: 'scatter', label: 'Dispersión', icon: '⚬'},
  {type: 'table', label: 'Tabla', icon: '📋'},
];

export function ChartConfigPanel({config, onChange, columns}: ChartConfigPanelProps) {
  const update = (patch: Partial<ChartConfig>) => onChange({...config, ...patch});

  return (
    <div className="space-y-4">
      {/* Chart type selector */}
      <div>
        <label className="text-sm font-medium mb-1 block">Tipo de gráfico</label>
        <div className="grid grid-cols-3 gap-1">
          {CHART_TYPES.map((ct) => (
            <button
              key={ct.type}
              onClick={() => update({type: ct.type})}
              className={`flex flex-col items-center gap-0.5 p-2 rounded text-xs transition-colors ${
                config.type === ct.type
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <span className="text-base">{ct.icon}</span>
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-sm font-medium mb-1 block">Título</label>
        <input
          type="text"
          value={config.title ?? ''}
          onChange={(e) => update({title: e.target.value})}
          placeholder="Título del gráfico"
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Field mappings — vary by chart type */}
      {config.type === 'pie' ? (
        <>
          <FieldSelect label="Etiqueta" value={config.xField ?? ''} columns={columns} onChange={(v) => update({xField: v})} />
          <FieldSelect label="Valor" value={config.yField ?? ''} columns={columns} onChange={(v) => update({yField: v})} />
        </>
      ) : config.type === 'scatter' ? (
        <>
          <FieldSelect label="Eje X" value={config.xField ?? ''} columns={columns} onChange={(v) => update({xField: v})} />
          <FieldSelect label="Eje Y" value={config.yField ?? ''} columns={columns} onChange={(v) => update({yField: v})} />
          <FieldSelect label="Color (categoría)" value={config.colorField ?? ''} columns={columns} onChange={(v) => update({colorField: v})} optional />
        </>
      ) : (
        <>
          <FieldSelect label="Eje X / Categoría" value={config.xField ?? ''} columns={columns} onChange={(v) => update({xField: v})} />
          <FieldSelect label="Eje Y / Valor" value={config.yField ?? ''} columns={columns} onChange={(v) => update({yField: v})} />
        </>
      )}

      {/* Toggles */}
      {(config.type === 'bar' || config.type === 'pie') && (
        <Toggle label="Horizontal" checked={config.horizontal ?? false} onChange={(v) => update({horizontal: v})} />
      )}
      <Toggle label="Mostrar grid" checked={config.showGrid ?? true} onChange={(v) => update({showGrid: v})} />
      <Toggle label="Mostrar leyenda" checked={config.showLegend ?? true} onChange={(v) => update({showLegend: v})} />
      <Toggle label="Mostrar etiquetas" checked={config.showLabels ?? true} onChange={(v) => update({showLabels: v})} />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  columns,
  onChange,
  optional = false,
}: {
  label: string;
  value: string;
  columns: string[];
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
      >
        {optional && <option value="">Ninguno</option>}
        {columns.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-zinc-400">{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-4 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-zinc-700'}`}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
    </label>
  );
}
