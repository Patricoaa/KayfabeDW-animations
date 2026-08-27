'use client';

import React from 'react';
import type {ChartConfig, ChartType, NumberFormat, SortBy, GroupMode} from '@/lib/chart-config';

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

const NUMBER_FORMATS: {value: NumberFormat; label: string}[] = [
  {value: 'short', label: 'Compacto (12k)'},
  {value: 'none', label: 'Entero (12000)'},
  {value: 'decimal', label: 'Decimal (12,55)'},
  {value: 'percent', label: 'Porcentaje'},
  {value: 'currency', label: 'Moneda'},
];

const SORTS: {value: SortBy; label: string}[] = [
  {value: 'none', label: 'Orden de consulta'},
  {value: 'value-desc', label: 'Valor ↓'},
  {value: 'value-asc', label: 'Valor ↑'},
  {value: 'label', label: 'Etiqueta A→Z'},
];

export function ChartConfigPanel({config, onChange, columns}: ChartConfigPanelProps) {
  const update = (patch: Partial<ChartConfig>) => onChange({...config, ...patch});
  const isSingleSeries = config.type === 'bar' || config.type === 'line' || config.type === 'area' || config.type === 'pie';

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
          {config.type !== 'table' && (
            <FieldSelect label="Agregación" value={config.aggregate ?? ''} columns={[]} onChange={(v) => update({aggregate: (v || undefined) as ChartConfig['aggregate']})} optional custom>
              <option value="">Ninguna</option>
              <option value="sum">Suma</option>
              <option value="avg">Promedio</option>
              <option value="count">Conteo</option>
              <option value="min">Mínimo</option>
              <option value="max">Máximo</option>
            </FieldSelect>
          )}
        </>
      )}

      {/* Toggles */}
      {config.type === 'bar' || config.type === 'line' || config.type === 'area' ? (
        <Toggle label="Horizontal" checked={config.horizontal ?? false} onChange={(v) => update({horizontal: v})} />
      ) : null}
      {config.type === 'bar' && (
        <div className="grid grid-cols-2 gap-1">
          {(['grouped', 'stacked'] as GroupMode[]).map((m) => (
            <button
              key={m}
              onClick={() => update({groupMode: m})}
              className={`px-2 py-1.5 rounded text-xs transition-colors ${
                (config.groupMode ?? 'grouped') === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {m === 'grouped' ? 'Agrupado' : 'Apuñado'}
            </button>
          ))}
        </div>
      )}
      {(config.type === 'line' || config.type === 'area') && (
        <Toggle label="Curva suavizada" checked={config.lineSmooth ?? false} onChange={(v) => update({lineSmooth: v})} />
      )}
      <Toggle label="Mostrar grid" checked={config.showGrid ?? true} onChange={(v) => update({showGrid: v})} />
      {config.type !== 'table' && <Toggle label="Mostrar etiquetas de datos" checked={config.showDataLabels ?? true} onChange={(v) => update({showDataLabels: v})} />}

      {/* Number format */}
      {isSingleSeries && (
        <div>
          <label className="text-sm font-medium mb-1 block">Formato de números</label>
          <select
            value={config.numberFormat ?? 'short'}
            onChange={(e) => update({numberFormat: e.target.value as NumberFormat})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
          >
            {NUMBER_FORMATS.map((nf) => (
              <option key={nf.value} value={nf.value}>{nf.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Sort + limit */}
      {isSingleSeries && (
        <>
          <div>
            <label className="text-sm font-medium mb-1 block">Ordenar por</label>
            <select
              value={config.sortBy ?? 'none'}
              onChange={(e) => update({sortBy: e.target.value as SortBy})}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Limitar filas</label>
            <input
              type="number"
              min={1}
              max={200}
              value={config.limit ?? ''}
              onChange={(e) => update({limit: e.target.value ? Number(e.target.value) : undefined})}
              placeholder="Sin límite"
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
            />
          </div>
        </>
      )}

      {/* Axis labels */}
      {config.type === 'bar' || config.type === 'line' || config.type === 'area' || config.type === 'scatter' ? (
        <>
          <div>
            <label className="text-sm font-medium mb-1 block">Etiqueta eje X</label>
            <input
              type="text"
              value={config.xLabel ?? ''}
              onChange={(e) => update({xLabel: e.target.value})}
              placeholder="Eje X"
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Etiqueta eje Y</label>
            <input
              type="text"
              value={config.yLabel ?? ''}
              onChange={(e) => update({yLabel: e.target.value})}
              placeholder="Eje Y"
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  columns,
  onChange,
  optional = false,
  custom = false,
  children,
}: {
  label: string;
  value: string;
  columns: string[];
  onChange: (v: string) => void;
  optional?: boolean;
  custom?: boolean;
  children?: React.ReactNode;
}) {
  if (custom) {
    return (
      <div>
        <label className="text-sm font-medium mb-1 block">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
        >
          {children}
        </select>
      </div>
    );
  }
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
