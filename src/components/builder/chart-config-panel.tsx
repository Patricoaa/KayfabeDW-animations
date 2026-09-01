'use client';

import React, {useEffect, useState} from 'react';
import {BarChart3, PieChart, LineChart, AreaChart, ScatterChart, Table2, ChevronDown} from 'lucide-react';
import type {ChartConfig, ChartType, NumberFormat, SortBy, ChartFilter, ChartFilterOp, LegendPosition, ChartStyle, AvatarShape, AvatarPosition, SectionFont, CategoryLabelPosition, FontWeight} from '@/lib/chart-config';
import {FONT_PRESETS, FONT_WEIGHTS, PALETTES} from '@/lib/chart-config';
import {pickColor, colorFor} from '@/lib/chart-data';

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
  data?: Record<string, unknown>[];
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
  {value: 'duration', label: 'Duración (hh:mm)'},
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

// Collapsible accordion section (Flourish-style single-open panel). Each
// section owns its own open state; "Datos" is open by default.
function Section({title, defaultOpen = false, children}: {title: string; defaultOpen?: boolean; children: React.ReactNode}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium font-display transition-colors ${
          open ? 'bg-amber-500/10 text-amber-500' : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
        }`}
      >
        {title}
        <ChevronDown size={14} className={`transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

export function ChartConfigPanel({config, onChange, columns, aliasToTable = {}, fanOutTables = [], fieldMeta = [], data}: ChartConfigPanelProps) {
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
  const updateStyle = (patch: Partial<ChartStyle>) => update({style: {...(config.style ?? {}), ...patch}});
  const applyPalette = (colors: string[]) => {
    // Multi-series: re-color every configured series AND refresh the global
    // palette, so both paths (empty legendItems vs populated) are covered.
    if (config.seriesField) {
      const items = (config.legendItems ?? []).map((li, i) => ({...li, color: colors[i % colors.length]}));
      update({colors, legendItems: items});
    } else {
      update({colors});
    }
  };
  const setSeriesColor = (index: number, color: string) => {
    const items = [...(config.legendItems ?? [])];
    if (!items[index]) items[index] = {label: `Serie ${index + 1}`, color};
    else items[index] = {...items[index], color};
    update({legendItems: items});
  };

  // Keep `legendItems` in sync with the real series names in the dataset.
  // Without this the per-series color pickers never render — the core reason
  // "Colores de serie" appeared dead. Colors come from the current palette.
  useEffect(() => {
    if (!config.seriesField || !data || data.length === 0) return;
    const names: string[] = [];
    for (const row of data) {
      const raw = row[config.seriesField];
      const name = raw === null || raw === undefined || String(raw) === '' ? '(vacío)' : String(raw);
      if (!names.includes(name)) names.push(name);
    }
    const existing = new Set((config.legendItems ?? []).map((li) => li.label));
    const missing = names.filter((n) => !existing.has(n));
    if (missing.length === 0) return;
    const base = config.legendItems?.length ?? 0;
    const added = missing.map((n, i) => ({label: n, color: pickColor(config.colors, base + i)}));
    update({legendItems: [...(config.legendItems ?? []), ...added]});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.seriesField, config.colors, config.legendItems, data]);

  const isSingleSeries = config.type === 'bar' || config.type === 'line' || config.type === 'area' || config.type === 'pie';
  const hasSeries = !!config.seriesField && (config.type === 'bar' || config.type === 'line' || config.type === 'area');
  const legendItems = config.legendItems ?? [];
  const isCartesian = config.type === 'bar' || config.type === 'line' || config.type === 'area' || config.type === 'scatter';
  const isStackedPercent = config.type === 'bar' && config.groupMode === 'stacked-percent';

  // Distinct category labels in the captured dataset, for the per-category
  // color overrides ("Colores por categoría"). Scatter colors come from its
  // colorField (falling back to the X axis); everything else uses xField.
  const catCol = config.type === 'scatter' ? (config.colorField ?? config.xField) : config.xField;
  const catLabels: string[] = [];
  if (catCol) {
    for (const row of data ?? []) {
      const raw = row[catCol];
      const lab = raw === null || raw === undefined || String(raw) === '' ? '(vacío)' : String(raw);
      if (catLabels.length < 50 && !catLabels.includes(lab)) catLabels.push(lab);
    }
  }
  const setColorOverride = (label: string, value?: string) => {
    const next = {...(config.colorOverrides ?? {})};
    if (value) next[label] = value;
    else delete next[label];
    update({colorOverrides: next});
  };
  const setHeaderFont = (patch: Partial<SectionFont>) => update({headerFont: {...(config.headerFont ?? {}), ...patch}});
  const setSubtitleFont = (patch: Partial<SectionFont>) => update({subtitleFont: {...(config.subtitleFont ?? {}), ...patch}});
  const setXLabelFont = (patch: Partial<SectionFont>) => update({xLabelFont: {...(config.xLabelFont ?? {}), ...patch}});
  const setYLabelFont = (patch: Partial<SectionFont>) => update({yLabelFont: {...(config.yLabelFont ?? {}), ...patch}});
  const setLegendFont = (patch: Partial<SectionFont>) => update({legendFont: {...(config.legendFont ?? {}), ...patch}});

  // RRSS-oriented canvas presets. Presets write width/height (and the preset
  // key for record-keeping); "personalizado" leaves them as edited.
  const CANVAS_PRESETS: Record<string, {width: number; height: number}> = {
    '600x380': {width: 600, height: 380},
    '1080x1080': {width: 1080, height: 1080},
    '1080x1350': {width: 1080, height: 1350},
    '1080x1920': {width: 1080, height: 1920},
    '1280x720': {width: 1280, height: 720},
    '900x320': {width: 900, height: 320},
  };
  const canvasKey = `${config.width ?? 600}x${config.height ?? 380}`;
  const presetKey = () => (CANVAS_PRESETS[canvasKey] ? canvasKey : 'custom');
  const applyPreset = (key: string) => {
    const p = CANVAS_PRESETS[key];
    if (p) update({width: p.width, height: p.height, canvasPreset: key});
  };

  // Fan-out detection: when aggregating a field from a shallower (non-leaf)
  // table with a plain count/sum/avg, the result reflects the deepest table's
  // granularity. Warn and point to count_distinct as the fix.
  const yTable = config.yField ? aliasToTable[config.yField] : undefined;
  const aggDangerous = config.aggregate === 'sum' || config.aggregate === 'avg' || config.aggregate === 'count';
  const showFanOutWarning =
    !!config.aggregate && aggDangerous && !!yTable && fanOutTables.includes(yTable);

  return (
    <div className="space-y-3">
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

      {/* ============ DATOS ============ */}
      <Section title="Datos" defaultOpen>
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
        {config.type !== 'table' && (
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
        )}

        {/* Row limit */}
        {isSingleSeries && (
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
        )}
      </Section>

      {/* ============ FUENTE ============ */}
      {config.type !== 'table' && (
        <Section title="Fuente">
          <div>
            <label className="text-sm font-medium mb-1 block">Fuente raíz del gráfico</label>
            <select
              value={config.style?.fontFamily ?? ''}
              onChange={(e) => updateStyle({fontFamily: e.target.value || undefined})}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">Sistema (predeterminado)</option>
              {FONT_PRESETS.map((f) => (
                <option key={f.name} value={f.family}>{f.name}</option>
              ))}
            </select>
          </div>
          <ColorInput label="Color de la fuente general" value={config.style?.textColor} onChange={(v) => updateStyle({textColor: v || undefined})} />
        </Section>
      )}

      {/* ============ HEADER ============ */}
      {config.type !== 'table' && (
        <Section title="Header">
          <div>
            <label className="text-sm font-medium mb-1 block">Título</label>
            <input
              type="text"
              value={config.title ?? ''}
              onChange={(e) => update({title: e.target.value})}
              placeholder="Título del gráfico"
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Subtítulo</label>
            <input
              type="text"
              value={config.subtitle ?? ''}
              onChange={(e) => update({subtitle: e.target.value})}
              placeholder="Subtítulo opcional"
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="pt-1 border-t border-border-subtle">
            <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Fuente del título</label>
            <div className="mt-2">
              <FontControls value={config.headerFont} onChange={setHeaderFont} />
            </div>
          </div>
          <div className="pt-1 border-t border-border-subtle">
            <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Fuente del subtítulo</label>
            <div className="mt-2">
              <FontControls value={config.subtitleFont} onChange={setSubtitleFont} />
            </div>
          </div>
        </Section>
      )}

      {/* ============ COLORES ============ */}
      {config.type !== 'table' && (
        <Section title="Colores">
          {/* Palettes */}
          <div>
            <label className="text-sm font-medium mb-1 block">Paleta de colores</label>
            <div className="space-y-2">
              {PALETTES.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPalette(p.colors)}
                  className="w-full text-left rounded-lg border border-border-subtle p-1.5 hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-secondary">{p.name}</span>
                    <span className="text-[10px] text-muted">Aplicar</span>
                  </div>
                  <div className="flex gap-0.5">
                    {p.colors.slice(0, 8).map((c, i) => (
                      <div key={i} className="flex-1 h-3 rounded-sm" style={{backgroundColor: c}} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Per-series color pickers (multi-series charts) */}
          {hasSeries && (
            <div className="pt-1">
              <label className="text-sm font-medium mb-1 block">Colores de serie</label>
              <div className="space-y-1.5">
                {legendItems.length === 0 && (
                  <p className="text-[10px] text-muted">Se detectan las series al elegir el campo «Serie».</p>
                )}
                {legendItems.map((li, i) => (
                  <div key={`${li.label}-${i}`} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={li.color}
                      onChange={(e) => setSeriesColor(i, e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-border-default bg-transparent"
                      aria-label={`Color de ${li.label}`}
                    />
                    <span className="text-xs text-secondary truncate">{li.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-category / per-datum color overrides */}
          {catLabels.length > 0 && (
            <div className="pt-1">
              <label className="text-sm font-medium mb-1 block">Colores por categoría</label>
              <p className="text-[10px] text-muted mb-1.5">Personaliza el color de cada categoría o dato individual.</p>
              <div className="space-y-1.5">
                {catLabels.map((label, i) => {
                  const effective = config.colorOverrides?.[label] ?? colorFor(config, label, i);
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={effective}
                        onChange={(e) => setColorOverride(label, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-border-default bg-transparent"
                        aria-label={`Color de ${label}`}
                      />
                      <span className="text-xs text-secondary truncate flex-1">{label}</span>
                      {config.colorOverrides?.[label] && (
                        <button
                          onClick={() => setColorOverride(label)}
                          className="text-muted hover:text-red-500 px-1 text-xs"
                          aria-label={`Restablecer color de ${label}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {config.type === 'bar' && (
            <ColorInput label="Color de valores negativos" value={config.negativeColor} onChange={(v) => update({negativeColor: v || undefined})} />
          )}
        </Section>
      )}

      {/* ============ BARRAS ============ */}
      {config.type === 'bar' && (
        <Section title="Barras">
          <Toggle label="Horizontal" checked={config.horizontal ?? false} onChange={(v) => update({horizontal: v})} />
          <div>
            <label className="text-sm font-medium mb-1 block">Modo de barras</label>
            <div className="flex gap-1">
              {[
                {value: 'grouped' as const, label: 'Agrupadas'},
                {value: 'stacked' as const, label: 'Apiladas'},
                {value: 'stacked-percent' as const, label: 'Apiladas %'},
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
          <NumberInput label="Radio de esquinas" value={config.barRadius} min={0} max={24} onChange={(v) => update({barRadius: v})} />
          <Toggle label="Píldora (radio solo en extremo exterior)" checked={config.barRadiusEndsOnly ?? false} onChange={(v) => update({barRadiusEndsOnly: v})} />
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="Grosor de borde" value={config.barBorderWidth} min={0} max={6} onChange={(v) => update({barBorderWidth: v})} />
            {(config.barBorderWidth ?? 0) > 0 && (
              <ColorInput label="Color de borde" value={config.barBorderColor} onChange={(v) => update({barBorderColor: v || undefined})} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="Gap entre barras" value={config.barGap} min={0} max={20} onChange={(v) => update({barGap: v})} />
            <NumberInput label="Gap de categoría" value={config.barCategoryGap} min={0} max={0.4} step={0.01} onChange={(v) => update({barCategoryGap: v})} />
          </div>
        </Section>
      )}

      {/* ============ LÍNEAS Y PUNTOS ============ */}
      {(config.type === 'line' || config.type === 'area' || config.type === 'scatter') && (
        <Section title="Líneas y puntos">
          {(config.type === 'line' || config.type === 'area') && (
            <>
              <Toggle label="Horizontal" checked={config.horizontal ?? false} onChange={(v) => update({horizontal: v})} />
              <Toggle label="Curva suavizada" checked={config.lineSmooth ?? false} onChange={(v) => update({lineSmooth: v})} />
              <Toggle label="Línea discontinua" checked={config.lineDash ?? false} onChange={(v) => update({lineDash: v})} />
            </>
          )}
          {(config.type === 'line' || config.type === 'area') && (
            <>
              <NumberInput label="Grosor de línea" value={config.style?.lineWidth} min={1} max={8} step={0.5} onChange={(v) => updateStyle({lineWidth: v})} />
              <Toggle label="Mostrar puntos" checked={config.showMarkers ?? true} onChange={(v) => update({showMarkers: v})} />
              {(config.showMarkers ?? true) && (
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="Tamaño de punto" value={config.style?.pointSize} min={1} max={12} onChange={(v) => updateStyle({pointSize: v})} />
                  <NumberInput label="Opacidad de punto" value={config.style?.pointOpacity} min={0.1} max={1} step={0.05} onChange={(v) => updateStyle({pointOpacity: v})} />
                </div>
              )}
            </>
          )}
          {config.type === 'scatter' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <NumberInput label="Tamaño de punto" value={config.style?.pointSize} min={1} max={12} onChange={(v) => updateStyle({pointSize: v})} />
                <NumberInput label="Opacidad de punto" value={config.style?.pointOpacity} min={0.1} max={1} step={0.05} onChange={(v) => updateStyle({pointOpacity: v})} />
              </div>
              <Toggle label="Línea de tendencia" checked={config.trendline ?? false} onChange={(v) => update({trendline: v})} />
            </>
          )}
        </Section>
      )}

      {/* ============ SEGMENTOS (PIE) ============ */}
      {config.type === 'pie' && (
        <Section title="Segmentos">
          <Toggle label="Donut" checked={(config.innerRadius ?? 0) > 0} onChange={(v) => update({innerRadius: v ? 66 : 0})} />
          {(config.innerRadius ?? 0) > 0 && (
            <div>
              <label className="text-sm font-medium mb-1 block">Grosor del anillo</label>
              <input
                type="range"
                min={25}
                max={85}
                value={config.innerRadius ?? 66}
                onChange={(e) => update({innerRadius: Number(e.target.value)})}
                className="w-full accent-amber-500"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Etiquetas de segmento</label>
            <select
              value={config.pieLabel ?? 'percent'}
              onChange={(e) => update({pieLabel: e.target.value as 'none' | 'value' | 'percent' | 'both'})}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="percent">Porcentaje</option>
              <option value="value">Valor</option>
              <option value="both">Valor y porcentaje</option>
              <option value="none">Ninguna</option>
            </select>
          </div>
          <NumberInput label="Máx. segmentos" value={config.sliceLimit} min={1} max={50} onChange={(v) => update({sliceLimit: v})} />
        </Section>
      )}

      {/* ============ ETIQUETAS ============ */}
      {config.type !== 'table' && (
        <Section title="Etiquetas">
          <Toggle label="Mostrar etiquetas de datos" checked={config.showDataLabels ?? true} onChange={(v) => update({showDataLabels: v})} />
          {(config.showDataLabels ?? true) && (
            <>
              {config.type === 'bar' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Posición</label>
                  <select
                    value={config.dataLabelPosition ?? 'auto'}
                    onChange={(e) => update({dataLabelPosition: e.target.value as 'auto' | 'inside' | 'outside' | 'center'})}
                    className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="auto">Automática</option>
                    <option value="outside">Fuera de la barra</option>
                    <option value="center">Centro</option>
                    <option value="inside">Dentro</option>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <NumberInput label="Tamaño" value={config.dataLabelFontSize} min={6} max={24} onChange={(v) => update({dataLabelFontSize: v})} />
                <ColorInput label="Color" value={config.dataLabelColor} onChange={(v) => update({dataLabelColor: v || undefined})} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Fuente de etiquetas</label>
                <FontFamilySelect value={config.dataLabelFontFamily} onChange={(v) => update({dataLabelFontFamily: v || undefined})} />
              </div>
            </>
          )}
          {isSingleSeries && (
            <div className="pt-1 border-t border-border-subtle">
              <label className="text-sm font-medium mb-1 block">Formato de números</label>
              {isStackedPercent ? (
                <p className="text-[10px] text-muted py-1">Forzado a porcentaje en apiladas %.</p>
              ) : (
                <select
                  value={config.numberFormat ?? 'short'}
                  onChange={(e) => update({numberFormat: e.target.value as NumberFormat})}
                  className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {NUMBER_FORMATS.map((nf) => (
                    <option key={nf.value} value={nf.value}>{nf.label}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </Section>
      )}

      {/* ============ EJE X / CATEGORÍA ============ */}
      {isCartesian && (
        <Section title="Eje X / Categoría">
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
          <div className="pt-1 border-t border-border-subtle">
            <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Fuente de etiquetas</label>
            <div className="mt-2">
              <FontControls value={config.xLabelFont} onChange={setXLabelFont} />
            </div>
          </div>

          {(config.type === 'bar' || config.type === 'line' || config.type === 'area') && (
            <div>
              <label className="text-sm font-medium mb-1 block">Ángulo de etiquetas</label>
              <input
                type="range"
                min={-90}
                max={90}
                value={config.labelAngle ?? 0}
                onChange={(e) => update({labelAngle: Number(e.target.value)})}
                className="w-full accent-amber-500"
              />
              <p className="text-[10px] text-muted text-right">{config.labelAngle ?? 0}°</p>
            </div>
          )}

          {config.type === 'bar' && (
            <div>
              <label className="text-sm font-medium mb-1 block">Posición de etiquetas de categoría</label>
              <select
                value={config.categoryLabelPosition ?? 'axis'}
                onChange={(e) => update({categoryLabelPosition: e.target.value as CategoryLabelPosition})}
                className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="hide">Ocultar</option>
                <option value="axis">En el eje</option>
                <option value="start-out">Fuera · inicio</option>
                <option value="center-out">Fuera · centro</option>
                <option value="end-out">Fuera · final</option>
                <option value="start-in">Dentro · inicio</option>
                <option value="center-in">Dentro · centro</option>
                <option value="end-in">Dentro · final</option>
              </select>
            </div>
          )}

          {config.type === 'scatter' && (
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="X mín." value={config.xMin} min={-1e9} max={1e9} onChange={(v) => update({xMin: v})} />
              <NumberInput label="X máx." value={config.xMax} min={-1e9} max={1e9} onChange={(v) => update({xMax: v})} />
            </div>
          )}
        </Section>
      )}

      {/* ============ EJE Y / DATOS ============ */}
      {isCartesian && (
        <Section title="Eje Y / Datos">
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
          <div className="pt-1 border-t border-border-subtle">
            <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Fuente de etiquetas</label>
            <div className="mt-2">
              <FontControls value={config.yLabelFont} onChange={setYLabelFont} />
            </div>
          </div>

          {isStackedPercent ? (
            <p className="text-[10px] text-muted py-1">Eje Y fijo en 0%–100% (apiladas %).</p>
          ) : (
            <>
              {isSingleSeries && (
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
              )}
              <Toggle label="Empezar en cero" checked={config.startAtZero ?? true} onChange={(v) => update({startAtZero: v})} />
              <NumberInput label="Cantidad de divisiones (Y)" value={config.tickCount} min={2} max={12} onChange={(v) => update({tickCount: v})} />
              <div className="grid grid-cols-2 gap-2">
                <NumberInput label="Y mín." value={config.yMin} min={-1e9} max={1e9} onChange={(v) => update({yMin: v})} />
                <NumberInput label="Y máx." value={config.yMax} min={-1e9} max={1e9} onChange={(v) => update({yMax: v})} />
              </div>
            </>
          )}

          <Toggle label="Mostrar grid" checked={config.showGrid ?? true} onChange={(v) => update({showGrid: v})} />

          {/* Reference lines */}
          <div className="pt-1 border-t border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Líneas de referencia</label>
              <button
                onClick={() => update({referenceLines: [...(config.referenceLines ?? []), {value: 0, dash: false}]})}
                className="text-xs text-amber-500 hover:text-amber-400 font-medium"
              >
                + Agregar
              </button>
            </div>
            {(config.referenceLines ?? []).length === 0 && (
              <p className="text-[10px] text-muted">Marcadores horizontales en un valor del eje Y (ej: promedio, objetivo).</p>
            )}
            {(config.referenceLines ?? []).map((rl, i) => (
              <div key={i} className="flex items-center gap-1.5 mb-1.5">
                <input
                  type="number"
                  value={rl.value}
                  onChange={(e) => {
                    const next = [...(config.referenceLines ?? [])];
                    next[i] = {...next[i], value: Number(e.target.value)};
                    update({referenceLines: next});
                  }}
                  className="w-16 bg-elevated border border-border-default rounded-lg px-2 py-1 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="color"
                  value={rl.color ?? '#f59e0b'}
                  onChange={(e) => {
                    const next = [...(config.referenceLines ?? [])];
                    next[i] = {...next[i], color: e.target.value};
                    update({referenceLines: next});
                  }}
                  className="w-7 h-7 rounded cursor-pointer border border-border-default bg-transparent"
                  aria-label={`Color línea ${i + 1}`}
                />
                <label className="flex items-center gap-1 text-[10px] text-muted">
                  <input
                    type="checkbox"
                    checked={rl.dash ?? false}
                    onChange={(e) => {
                      const next = [...(config.referenceLines ?? [])];
                      next[i] = {...next[i], dash: e.target.checked};
                      update({referenceLines: next});
                    }}
                  />
                  guión
                </label>
                <input
                  type="text"
                  value={rl.label ?? ''}
                  onChange={(e) => {
                    const next = [...(config.referenceLines ?? [])];
                    next[i] = {...next[i], label: e.target.value};
                    update({referenceLines: next});
                  }}
                  placeholder="etiqueta"
                  className="flex-1 bg-elevated border border-border-default rounded-lg px-2 py-1 text-[10px] font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  onClick={() => {
                    const next = [...(config.referenceLines ?? [])];
                    next.splice(i, 1);
                    update({referenceLines: next});
                  }}
                  className="text-muted hover:text-red-500 px-1 text-xs"
                  aria-label="Eliminar línea de referencia"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ============ LEYENDAS ============ */}
      {(config.type === 'bar' || config.type === 'line' || config.type === 'area' || config.type === 'scatter' || config.type === 'pie') && (
        <Section title="Leyendas">
          <Toggle label="Mostrar leyenda" checked={config.showLegend ?? true} onChange={(v) => update({showLegend: v})} />
          {(config.showLegend ?? true) && (
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
          )}
          {(config.type === 'line' || config.type === 'area') && (
            <Toggle label="Mostrar puntos" checked={config.showMarkers ?? true} onChange={(v) => update({showMarkers: v})} />
          )}
          <div className="pt-1 border-t border-border-subtle">
            <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Fuente de la leyenda</label>
            <div className="mt-2">
              <FontControls value={config.legendFont} onChange={setLegendFont} />
            </div>
          </div>
        </Section>
      )}

      {/* ============ LIENZO ============ */}
      <Section title="Lienzo">
        <div>
          <label className="text-sm font-medium mb-1 block">Tamaño del lienzo</label>
          <select
            value={presetKey()}
            onChange={(e) => applyPreset(e.target.value)}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="600x380">Estándar (600×380)</option>
            <option value="1080x1080">IG Cuadrado (1080×1080)</option>
            <option value="1080x1350">IG 4:5 (1080×1350)</option>
            <option value="1080x1920">Story 9:16 (1080×1920)</option>
            <option value="1280x720">YouTube 16:9 (1280×720)</option>
            <option value="900x320">Panorámica (900×320)</option>
            <option value="custom">Personalizado</option>
          </select>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <NumberInput label="Ancho" value={config.width} min={300} max={1600} step={20} onChange={(v) => update({width: v})} />
            <NumberInput label="Alto" value={config.height} min={200} max={1000} step={20} onChange={(v) => update({height: v})} />
          </div>
        </div>
        <div className="pt-1 border-t border-border-subtle">
          <ColorInput label="Color de fondo" value={config.canvasBackground} onChange={(v) => update({canvasBackground: v || undefined})} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <NumberInput label="Borde (grosor)" value={config.canvasBorderWidth} min={0} max={8} onChange={(v) => update({canvasBorderWidth: v})} />
            {(config.canvasBorderWidth ?? 0) > 0 && (
              <ColorInput label="Borde (color)" value={config.canvasBorderColor} onChange={(v) => update({canvasBorderColor: v || undefined})} />
            )}
          </div>
          <NumberInput label="Radio de esquinas del lienzo" value={config.canvasBorderRadius} min={0} max={40} onChange={(v) => update({canvasBorderRadius: v})} />
        </div>
      </Section>

      {/* ============ AVATAR ============ */}
      {config.type === 'bar' && (
        <Section title="Avatar">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium block">Avatares (imágenes)</label>
            {config.avatarField && (
              <button onClick={() => update({avatarField: undefined})} className="text-xs text-amber-500 hover:text-amber-400 font-medium">
                Quitar
              </button>
            )}
          </div>
          <FieldSelect
            label="Columna de imagen"
            value={config.avatarField ?? ''}
            options={fieldMeta}
            fallback={columns}
            onChange={(v) => update({avatarField: v || undefined})}
            optional
          />
          {config.avatarField && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">Forma</label>
                <div className="flex gap-1">
                  {([
                    {value: 'circle', label: 'Círculo'},
                    {value: 'rounded', label: 'Esquinas redondeadas'},
                  ] as {value: AvatarShape; label: string}[]).map((s) => (
                    <button
                      key={s.value}
                      onClick={() => update({avatarShape: s.value})}
                      className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                        (config.avatarShape ?? 'circle') === s.value
                          ? 'bg-amber-500 text-black'
                          : 'bg-elevated text-secondary hover:bg-card-hover'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <NumberInput label="Tamaño" value={config.avatarSize} min={8} max={128} step={2} onChange={(v) => update({avatarSize: v})} />
              {(config.avatarShape ?? 'circle') === 'rounded' && (
                <NumberInput label="Radio de esquina" value={config.avatarRadius} min={0} max={40} step={1} onChange={(v) => update({avatarRadius: v})} />
              )}
              <div>
                <label className="text-sm font-medium mb-1 block">Posición</label>
                <select
                  value={config.avatarPosition ?? 'above'}
                  onChange={(e) => update({avatarPosition: e.target.value as AvatarPosition})}
                  className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="above">Sobre la barra</option>
                  <option value="bar-end">Al final de la barra</option>
                  <option value="beside-label">Junto a la etiqueta</option>
                  <option value="after-label">Después de la etiqueta</option>
                </select>
                <p className="text-[10px] text-muted pt-1">En vertical, sobre la barra y al final de la barra quedan sobre el extremo de la columna.</p>
              </div>
              <p className="text-[10px] text-muted">Las imágenes se muestran en el preview y en el SVG descargado; puede que no aparezcan al exportar a PNG.</p>
            </>
          )}
        </Section>
      )}

      {/* Tooltip */}
      {config.type !== 'table' && (
        <div className="flex justify-between items-center px-1">
          <label className="text-sm text-secondary">Tooltip al pasar el cursor</label>
          <input
            type="checkbox"
            role="switch"
            checked={config.tooltipEnabled ?? true}
            onChange={(e) => update({tooltipEnabled: e.target.checked})}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className={`relative w-9 h-5 rounded-full transition-colors ${
              config.tooltipEnabled ? 'bg-amber-500' : 'bg-border-default'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                config.tooltipEnabled ? 'translate-x-4' : ''
              }`}
            />
          </span>
        </div>
      )}
    </div>
  );
}

function ColorInput({label, value, onChange}: {label: string; value?: string; onChange: (v: string) => void}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="color"
        value={value ?? '#888888'}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-border-default bg-transparent"
        aria-label={label}
      />
      <span className="text-xs text-secondary">{label}</span>
    </label>
  );
}

function NumberInput({label, value, min, max, step = 1, onChange}: {label: string; value?: number; min: number; max: number; step?: number; onChange: (v: number | undefined) => void}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
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

      {/* Search filter */}
      <div>
        <label className="text-sm font-medium mb-1 block">Buscar en filas</label>
        <input
          type="text"
          value={config.tableSearch ?? ''}
          onChange={(e) => onUpdate({tableSearch: e.target.value})}
          placeholder="Filtra por cualquier columna"
          className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Sticky header */}
      <label className="flex items-center justify-between cursor-pointer select-none">
        <span className="text-sm text-secondary">Encabezado fijo</span>
        <input
          type="checkbox"
          role="switch"
          checked={config.stickyHeader ?? false}
          onChange={(e) => onUpdate({stickyHeader: e.target.checked})}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`relative w-9 h-5 rounded-full transition-colors ${
            config.stickyHeader ? 'bg-amber-500' : 'bg-border-default'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              config.stickyHeader ? 'translate-x-4' : ''
            }`}
          />
        </span>
      </label>

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

function FontFamilySelect({value, onChange}: {value?: string; onChange: (v: string) => void}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
    >
      <option value="">Heredar (por defecto)</option>
      {FONT_PRESETS.map((f) => (
        <option key={f.name} value={f.family}>{f.name}</option>
      ))}
    </select>
  );
}

function WeightControl({value, onChange}: {value?: FontWeight; onChange: (v?: FontWeight) => void}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Peso</label>
      <div className="flex gap-1 mt-1.5">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            value === undefined ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover'
          }`}
        >
          Auto
        </button>
        {FONT_WEIGHTS.map((w) => (
          <button
            key={w.value}
            type="button"
            onClick={() => onChange(w.value)}
            style={{fontWeight: w.value}}
            className={`flex-1 px-2 py-1.5 rounded text-xs transition-colors ${
              value === w.value ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FontControls({value, onChange}: {value?: SectionFont; onChange: (patch: Partial<SectionFont>) => void}) {
  return (
    <div className="space-y-2">
      <WeightControl value={value?.weight} onChange={(w) => onChange({weight: w})} />
      <div>
        <label className="text-sm font-medium mb-1 block">Familia</label>
        <FontFamilySelect value={value?.fontFamily} onChange={(v) => onChange({fontFamily: v || undefined})} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Tamaño" value={value?.size} min={6} max={40} onChange={(v) => onChange({size: v})} />
        <ColorInput label="Color" value={value?.color} onChange={(v) => onChange({color: v || undefined})} />
      </div>
    </div>
  );
}