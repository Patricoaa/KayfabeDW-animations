'use client';

import React from 'react';
import {BarChart3, PieChart, LineChart, AreaChart, ScatterChart, Table2} from 'lucide-react';
import type {ChartConfig, ChartType, NumberFormat, SortBy, ChartFilter, ChartFilterOp, LegendPosition} from '@/lib/chart-config';

// Metadata for a selected column available to the axis selectors: its alias
// (the value used as a row key), its origin table, the bare column name, and
// whether it is numeric (used to filter "value" roles to numerics only).
export type ColumnMeta = {
  alias: string;
  table: string;
  name: string;
  isNumeric: boolean;
};

type ChartConfigPanelProps = {
  config: ChartConfig;
  onChange: (config: ChartConfig) => void;
  columns: string[];
  aliasToTable?: Record<string, string>;
  fanOutTables?: string[];
  fieldMeta?: ColumnMeta[];
};

const CHART_TYPES: {type: ChartType; label: string; Icon: typeof BarChart3}[] = [
  {type: 'bar', label: 'Barras', Icon: BarChart3},
  {type: 'pie', label: 'Pie', Icon: PieChart},
  {type: 'line', label: 'Líneas', Icon: LineChart},
  {type: 'area', label: 'Área', Icon: AreaChart},
  {type: 'scatter', label: 'Dispersión', Icon: ScatterChart},
  {type: 'table', label: 'Tabla', Icon: Table2},
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

const FILTER_OPS: {value: ChartFilterOp; label: string}[] = [
  {value: 'eq', label: '='},
  {value: 'neq', label: '≠'},
  {value: 'gt', label: '>'},
  {value: 'gte', label: '≥'},
  {value: 'lt', label: '<'},
  {value: 'lte', label: '≤'},
  {value: 'contains', label: 'contiene'},
  {value: 'is_empty', label: 'vacío'},
  {value: 'is_not_empty', label: 'no vacío'},
];

export function ChartConfigPanel({config, onChange, columns, aliasToTable = {}, fanOutTables = [], fieldMeta = []}: ChartConfigPanelProps) {
  const update = (patch: Partial<ChartConfig>) => onChange({...config, ...patch});
  const updateFilter = (index: number, patch: Partial<ChartFilter>) => {
    const next = [...(config.filters ?? [])];
    next[index] = {...next[index], ...patch};
    update({filters: next});
  };
  const updateFilterRemove = (index: number) => {
    const next = [...(config.filters ?? [])];
    next.splice(index, 1);
    update({filters: next});
  };
  const isSingleSeries = config.type === 'bar' || config.type === 'line' || config.type === 'area' || config.type === 'pie';

  // Fan-out detection: when aggregating a field from a shallower (non-leaf)
  // table with a plain count/sum/avg, the result reflects the deepest table's
  // granularity. Warn and point to count_distinct as the fix.
  const yTable = config.yField ? aliasToTable[config.yField] : undefined;
  const aggDangerous = config.aggregate === 'sum' || config.aggregate === 'avg' || config.aggregate === 'count';
  const showFanOutWarning =
    !!config.aggregate && aggDangerous && !!yTable && fanOutTables.includes(yTable);

  return (
    <div className="space-y-4">
      {/* Chart type selector */}
      <div>
        <label className="text-sm font-medium mb-1 block font-display">Tipo de gráfico</label>
        <div className="grid grid-cols-3 gap-1">
          {CHART_TYPES.map((ct) => (
            <button
              key={ct.type}
              onClick={() => update({type: ct.type})}
              className={`flex flex-col items-center gap-0.5 p-2 rounded text-xs transition-colors ${
                config.type === ct.type
                  ? 'bg-amber-500 text-black'
                  : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
              }`}
            >
              <ct.Icon size={16} />
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-sm font-medium mb-1 block font-display">Título</label>
        <input
          type="text"
          value={config.title ?? ''}
          onChange={(e) => update({title: e.target.value})}
          placeholder="Título del gráfico"
          className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Field mappings — vary by chart type */}
      {config.type === 'pie' ? (
        <>
          <FieldSelect label="Etiqueta" value={config.xField ?? ''} options={fieldMeta} fallback={columns} onChange={(v) => update({xField: v})} />
          <FieldSelect label="Valor" value={config.yField ?? ''} options={fieldMeta} fallback={columns} role="numeric" onChange={(v) => update({yField: v})} />
        </>
      ) : config.type === 'scatter' ? (
        <>
          <FieldSelect label="Eje X" value={config.xField ?? ''} options={fieldMeta} fallback={columns} role="numeric" onChange={(v) => update({xField: v})} />
          <FieldSelect label="Eje Y" value={config.yField ?? ''} options={fieldMeta} fallback={columns} role="numeric" onChange={(v) => update({yField: v})} />
          <FieldSelect label="Color (categoría)" value={config.colorField ?? ''} options={fieldMeta} fallback={columns} onChange={(v) => update({colorField: v})} optional />
        </>
      ) : (
        <>
          {config.type !== 'table' && (
            <>
              <FieldSelect label="Eje X / Categoría" value={config.xField ?? ''} options={fieldMeta} fallback={columns} onChange={(v) => update({xField: v})} />
              <FieldSelect label="Eje Y / Valor" value={config.yField ?? ''} options={fieldMeta} fallback={columns} role="numeric" onChange={(v) => update({yField: v})} />
              <FieldSelect
                label="Serie (opcional)"
                value={config.seriesField ?? ''}
                options={fieldMeta}
                fallback={columns}
                onChange={(v) => update({seriesField: v || undefined})}
                optional
              />
            </>
          )}
          {config.type === 'table' && (
            <TableControls
              columns={columns}
              config={config}
              onUpdate={update}
            />
          )}
          {config.type !== 'table' && (
            <FieldSelect label="Agregación" value={config.aggregate ?? ''} onChange={(v) => update({aggregate: (v || undefined) as ChartConfig['aggregate']})} optional custom>
              <option value="">Ninguna</option>
              <option value="sum">Suma</option>
              <option value="avg">Promedio</option>
              <option value="count">Conteo</option>
              <option value="count_distinct">Conteo distintivo</option>
              <option value="min">Mínimo</option>
              <option value="max">Máximo</option>
            </FieldSelect>
          )}
          {showFanOutWarning && (
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-600 leading-snug">
              Hay un fan-out en el JOIN: el campo «{config.yField}» pertenece a «{yTable}», que se repite por cada fila de la tabla más profunda. Con «{config.aggregate}» cada fila se cuenta una vez por repetición. Usá <span className="font-semibold">Conteo distintivo</span> para contar entidades reales de «{yTable}».
            </div>
          )}
        </>
      )}

      {/* Post-capture row filters (applied on the fetched dataset, not SQL) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium block">Filtrar filas</label>
          <button
            onClick={() => {
              const next = [...(config.filters ?? []), {column: columns[0] ?? '', op: 'eq' as ChartFilterOp, value: ''}];
              update({filters: next});
            }}
            className="text-xs text-amber-500 hover:text-amber-400 font-medium"
          >
            + Agregar filtro
          </button>
        </div>
        {(!config.filters || config.filters.length === 0) && (
          <p className="text-[10px] text-muted">Filtra las filas ya capturadas en el paso 1 (no cambia tu query).</p>
        )}
        {(config.filters ?? []).map((f, i) => (
          <div key={i} className="flex items-center gap-1 mb-1.5">
            <select
              value={f.column}
              onChange={(e) => updateFilter(i, {column: e.target.value})}
              className="flex-1 bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {columns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={f.op}
              onChange={(e) => updateFilter(i, {op: e.target.value as ChartFilterOp})}
              className="bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {FILTER_OPS.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            {f.op !== 'is_empty' && f.op !== 'is_not_empty' && (
              <input
                type="text"
                value={f.value ?? ''}
                onChange={(e) => updateFilter(i, {value: e.target.value})}
                placeholder="valor"
                className="w-24 bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            )}
            <button
              onClick={() => updateFilterRemove(i)}
              className="text-muted hover:text-red-500 px-1 text-xs"
              aria-label="Eliminar filtro"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Toggles */}
      {config.type === 'bar' || config.type === 'line' || config.type === 'area' ? (
        <Toggle label="Horizontal" checked={config.horizontal ?? false} onChange={(v) => update({horizontal: v})} />
      ) : null}
      {(config.type === 'line' || config.type === 'area') && (
        <Toggle label="Curva suavizada" checked={config.lineSmooth ?? false} onChange={(v) => update({lineSmooth: v})} />
      )}
      {config.type === 'bar' && (
        <div>
          <label className="text-sm font-medium mb-1 block">Modo de barras</label>
          <div className="flex gap-1">
            {[
              {value: 'grouped' as const, label: 'Agrupadas'},
              {value: 'stacked' as const, label: 'Apiladas'},
            ].map((m) => (
              <button
                key={m.value}
                onClick={() => update({groupMode: m.value})}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  (config.groupMode ?? 'grouped') === m.value
                    ? 'bg-amber-500 text-black'
                    : 'bg-elevated text-secondary hover:bg-card-hover'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {config.type === 'bar' || config.type === 'line' || config.type === 'area' ? (
        <>
          <Toggle label="Mostrar leyenda" checked={config.showLegend ?? true} onChange={(v) => update({showLegend: v})} />
          <div>
            <label className="text-sm font-medium mb-1 block">Posición de leyenda</label>
            <select
              value={config.legendPosition ?? 'bottom'}
              onChange={(e) => update({legendPosition: e.target.value as LegendPosition})}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="top">Arriba</option>
              <option value="bottom">Abajo</option>
              <option value="right">Derecha</option>
            </select>
          </div>
        </>
      ) : null}
      {config.type === 'line' || config.type === 'area' ? (
        <Toggle label="Mostrar puntos" checked={config.showMarkers ?? true} onChange={(v) => update({showMarkers: v})} />
      ) : null}
      {config.type !== 'table' && <Toggle label="Mostrar grid" checked={config.showGrid ?? true} onChange={(v) => update({showGrid: v})} />}
      {config.type !== 'table' && <Toggle label="Mostrar etiquetas de datos" checked={config.showDataLabels ?? true} onChange={(v) => update({showDataLabels: v})} />}

      {/* Number format */}
      {isSingleSeries && (
        <div>
          <label className="text-sm font-medium mb-1 block">Formato de números</label>
          <select
            value={config.numberFormat ?? 'short'}
            onChange={(e) => update({numberFormat: e.target.value as NumberFormat})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
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
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Filas del gráfico</label>
            <input
              type="number"
              min={1}
              max={200}
              value={config.limit ?? ''}
              onChange={(e) => update({limit: e.target.value ? Number(e.target.value) : undefined})}
              placeholder="Sin límite"
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <p className="text-[10px] text-muted mt-0.5">Límite de presentación en el gráfico; no altera los datos capturados.</p>
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
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Etiqueta eje Y</label>
            <input
              type="text"
              value={config.yLabel ?? ''}
              onChange={(e) => update({yLabel: e.target.value})}
              placeholder="Eje Y"
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
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
  options = [],
  fallback = [],
  role = 'any',
  onChange,
  optional = false,
  custom = false,
  children,
}: {
  label: string;
  value: string;
  options?: ColumnMeta[];
  fallback?: string[];
  role?: 'any' | 'numeric';
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
          className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          {children}
        </select>
      </div>
    );
  }

  // When we have rich metadata, filter numeric-only roles and label options
  // with their table when multiple tables are present. Always keep the
  // currently selected value visible even if it no longer matches the type
  // filter, so a previous selection isn't silently hidden.
  const useMeta = options.length > 0;
  const showTable = useMeta && new Set(options.map((o) => o.table)).size > 1;
  const numericList = options.filter((o) => o.isNumeric);

  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        {optional && <option value="">Ninguno</option>}
        {!useMeta &&
          fallback.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        {useMeta &&
          (role === 'numeric' ? numericList : options).map((o) => (
            <option key={o.alias} value={o.alias}>
              {showTable ? `${o.table}.${o.name}` : o.alias}
            </option>
          ))}
        {useMeta && value && role === 'numeric' && !numericList.some((o) => o.alias === value) && (
          <option value={value} disabled>
            {showTable ? value : value} (no disponible para este eje)
          </option>
        )}
      </select>
    </div>
  );
}

function TableControls({
  columns,
  config,
  onUpdate,
}: {
  columns: string[];
  config: ChartConfig;
  onUpdate: (patch: Partial<ChartConfig>) => void;
}) {
  const shown = config.tableColumns ?? [];
  const toggleCol = (col: string) => {
    const next = shown.includes(col) ? shown.filter((c) => c !== col) : [...shown, col];
    onUpdate({tableColumns: next});
  };

  return (
    <div className="space-y-3">
      {/* Column selection */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium block">Columnas a mostrar</label>
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate({tableColumns: []})}
              className="text-[10px] text-amber-500 hover:text-amber-400 font-medium"
            >
              Todas
            </button>
            <button
              onClick={() => onUpdate({tableColumns: columns})}
              className="text-[10px] text-muted hover:text-primary font-medium"
            >
              Ninguna
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {columns.length === 0 ? (
            <p className="text-[10px] text-muted">Sin columnas</p>
          ) : columns.map((c) => {
            const active = shown.length === 0 || shown.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCol(c)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors border ${
                  active
                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    : 'bg-elevated text-muted border-border-subtle'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted mt-1">Vacío = mostrar todas las columnas.</p>
      </div>

      {/* Row limit */}
      <div>
        <label className="text-sm font-medium mb-1 block">Máx. filas a mostrar</label>
        <input
          type="number"
          min={1}
          max={5000}
          value={config.tableLimit ?? ''}
          onChange={(e) => onUpdate({tableLimit: e.target.value ? Number(e.target.value) : undefined})}
          placeholder="500"
          className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Sort by column */}
      <div className="space-y-2">
        <label className="text-sm font-medium block">Ordenar por</label>
        <div className="flex gap-2">
          <select
            value={config.tableSort?.column ?? ''}
            onChange={(e) =>
              onUpdate({
                tableSort: e.target.value
                  ? {column: e.target.value, direction: config.tableSort?.direction ?? 'asc'}
                  : undefined,
              })
            }
            className="flex-1 bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Sin orden</option>
            {columns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {config.tableSort?.column && (
            <select
              value={config.tableSort.direction}
              onChange={(e) =>
                onUpdate({tableSort: {column: config.tableSort!.column, direction: e.target.value as 'asc' | 'desc'}})
              }
              className="bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          )}
        </div>
      </div>
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
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className="text-sm text-secondary">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-amber-500' : 'bg-border-default'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </span>
    </label>
  );
}
