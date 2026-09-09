'use client';

import React, {useEffect, useState} from 'react';
import {BarChart3} from 'lucide-react';
import type {ChartConfig, ChartOverlay, NumberFormat, SortBy, ChartFilter, ChartFilterOp, ChartStyle, AvatarShape, AvatarCrop, SectionFont, TextLayout} from '@/lib/chart-config';
import {FONT_PRESETS, NUMBER_FORMATS} from '@/lib/chart-config';
import {pickColor, colorFor} from '@/lib/chart-data';
import {ICON_GLYPHS, ICON_GLYPH_NAMES} from '@/lib/chart-icons';
import { Tabs, SelectControl, NumberControl, ColorPickerControl, SwitchControl, Collapsible, TextStyleControls, SliderNumberInput, FileUploadInput, FieldSelect, PalettePicker, OverlayEditor } from '@/components/ui/controls';
import type {ColumnMeta} from '@/lib/chart-config';
export type {ColumnMeta};

// Metadata for a selected column available to the axis selectors: its alias
// (the value used as a row key), its origin table, the bare column name, and
// whether it is numeric (used to filter "value" roles to numerics only).

type ChartConfigPanelProps = {
  config: ChartConfig;
  onChange: (config: ChartConfig) => void;
  columns: string[];
  aliasToTable?: Record<string, string>;
  fanOutTables?: string[];
  fieldMeta?: ColumnMeta[];
  data?: Record<string, unknown>[];
};

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

let overlaySeq = 0;
function newOverlayId(): string {
  overlaySeq += 1;
  return `ov-${Date.now().toString(36)}-${overlaySeq}`;
}

export function ChartConfigPanel({config, onChange, columns, aliasToTable = {}, fanOutTables = [], fieldMeta = [], data}: ChartConfigPanelProps) {
  const update = (patch: Partial<ChartConfig>) => onChange({...config, ...patch});
  const setOverlay = (index: number, patch: Partial<ChartOverlay>) => {
    const next = [...(config.overlays ?? [])];
    next[index] = {...next[index], ...patch};
    update({overlays: next});
  };
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

const setLegendTextOverride = (label: string, value?: string) => {
    const next = {...(config.legendTextOverrides ?? {})};
    if (value && value.trim()) next[label] = value.trim();
    else delete next[label];
    update({legendTextOverrides: next});
  };

  // Visible-title overrides keyed by the ORIGINAL label. Resolution matches
  // legendItemsFrom: legendTextOverrides > legendItems[].overrideLabel > label.
  const legendOverrideValue = (label: string): string =>
    config.legendTextOverrides?.[label]?.trim()
    || (config.legendItems ?? []).find((li) => li.label === label)?.overrideLabel?.trim()
    || '';

  const setAvatarCrop = (label: string, patch?: Partial<AvatarCrop>) => {
    const next = {...(config.avatarCrops ?? {})};
    if (patch) next[label] = {...(next[label] ?? {}), ...patch};
    else delete next[label];
    update({avatarCrops: next});
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

  const hasSeries = !!config.seriesField;
  const legendItems = config.legendItems ?? [];
  const isStackedPercent = config.groupMode === 'stacked-percent' || config.groupMode === 'grouped-percent';

  // Distinct category labels in the captured dataset, for the per-category
  // color overrides ("Colores por categoría").
  const catCol = config.xField;
  const catLabels: string[] = [];
  if (catCol) {
    for (const row of data ?? []) {
      const raw = row[catCol];
      const lab = raw === null || raw === undefined || String(raw) === '' ? '(vacío)' : String(raw);
      if (catLabels.length < 50 && !catLabels.includes(lab)) catLabels.push(lab);
    }
  }
  // Labels shown in the legend, for the "Texto de la leyenda" override block.
  // Multi-series use the detected series names (legendItems); everything else
  // (pie slices, scatter categories, single-series bars) uses the categories.
  const legendOverrideLabels: string[] =
    config.seriesField && legendItems.length > 0
      ? legendItems.map((li) => li.label)
      : catLabels;

  // First valid avatar image URL per category (mirrors the chart's categoryImages
  // so the crop-grid preview thumbnails show the real source image).
  const categoryImageMap = new Map<string, string>();
  if (config.avatarField && catCol) {
    for (const row of data ?? []) {
      const rawCat = row[catCol];
      const lab = rawCat === null || rawCat === undefined || String(rawCat) === '' ? '(vacío)' : String(rawCat);
      if (categoryImageMap.has(lab)) continue;
      const rawImg = row[config.avatarField];
      if (
        typeof rawImg === 'string' &&
        (rawImg.trim().startsWith('http://') ||
          rawImg.trim().startsWith('https://') ||
          rawImg.trim().startsWith('data:image/') ||
          rawImg.trim().startsWith('/'))
      ) {
        categoryImageMap.set(lab, rawImg.trim());
      }
    }
  }

  const setColorOverride = (label: string, value?: string) => {
    const next = {...(config.colorOverrides ?? {})};
    if (value) next[label] = value;
    else delete next[label];
    update({colorOverrides: next});
  };
  const setCategoryTextOverride = (label: string, ov?: {label?: string; sub?: string}) => {
    const next = {...(config.categoryTextOverrides ?? {})};
    const labelVal = ov?.label ?? '';
    const hasSub = ov?.sub !== undefined;
    if (labelVal || hasSub) next[label] = hasSub ? {label: labelVal || undefined, sub: ov.sub} : labelVal;
    else delete next[label];
    update({categoryTextOverrides: next});
  };
  const setHeaderFont = (patch: Partial<SectionFont>) => update({headerFont: {...(config.headerFont ?? {}), ...patch}});
  const setSubtitleFont = (patch: Partial<SectionFont>) => update({subtitleFont: {...(config.subtitleFont ?? {}), ...patch}});
  const setLegendLayout = (patch: Partial<TextLayout>) => update({legendLayout: {...(config.legendLayout ?? {}), ...patch}});
  const setLegendFont = (patch: Partial<SectionFont>) => update({legendFont: {...(config.legendFont ?? {}), ...patch}});
  const setDataLabelFont = (patch: Partial<SectionFont>) => update({dataLabelFont: {...(config.dataLabelFont ?? {}), ...patch}});
  const setCategoryDescriptionFont = (patch: Partial<SectionFont>) => update({categoryDescriptionFont: {...(config.categoryDescriptionFont ?? {}), ...patch}});

  // Fan-out detection: when aggregating a field from a shallower (non-leaf)
  // table with a plain count/sum/avg, the result reflects the deepest table's
  // granularity. Warn and point to count_distinct as the fix.
  const yTable = config.yField ? aliasToTable[config.yField] : undefined;
  const aggDangerous = config.aggregate === 'sum' || config.aggregate === 'avg' || config.aggregate === 'count';
  const showFanOutWarning =
    !!config.aggregate && aggDangerous && !!yTable && fanOutTables.includes(yTable);

  return (
    <Tabs 
      tabs={[
        { id: 'data', label: 'Datos' },
        { id: 'design', label: 'Diseño' }
      ]}
      className="h-full"
    >
      {(activeTab) => (
        <div className="space-y-4 pb-12">
          {activeTab === 'data' && (
            <>
      {/* ============ DATOS ============ */}
      <Collapsible title="Datos" defaultOpen>
        {/* Field mappings — bar chart */}
        <FieldSelect label="Eje X / Categoría" value={config.xField ?? ''} options={fieldMeta} fallback={columns} onChange={(v) => update({xField: v})} />
        <FieldSelect
          label="Descripción (opcional)"
          value={config.categoryDescriptionField ?? ''}
          options={fieldMeta}
          fallback={columns}
          onChange={(v) => update({categoryDescriptionField: v || undefined})}
          optional
        />
        <FieldSelect label="Eje Y / Valor" value={config.yField ?? ''} options={fieldMeta} fallback={columns} role="numeric" onChange={(v) => update({yField: v})} />
        <FieldSelect
          label="Serie (opcional)"
          value={config.seriesField ?? ''}
          options={fieldMeta}
          fallback={columns}
          onChange={(v) => update({seriesField: v || undefined})}
          optional
        />
        <FieldSelect label="Agregación" value={config.aggregate ?? ''} onChange={(v) => update({aggregate: (v || undefined) as ChartConfig['aggregate']})} optional custom>
          <option value="">Ninguna</option>
          <option value="sum">Suma</option>
          <option value="avg">Promedio</option>
          <option value="count">Conteo</option>
          <option value="count_distinct">Conteo distintivo</option>
          <option value="min">Mínimo</option>
          <option value="max">Máximo</option>
        </FieldSelect>
        {showFanOutWarning && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-600 leading-snug">
                Hay un fan-out en el JOIN: el campo «{config.yField}» pertenece a «{yTable}», que se repite por cada fila de la tabla más profunda. Con «{config.aggregate}» cada fila se cuenta una vez por repetición. Usá <span className="font-semibold">Conteo distintivo</span> para contar entidades reales de «{yTable}».
              </div>
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
                <SelectControl
                  value={f.column}
                  onChange={(e) => updateFilter(i, {column: e.target.value})}
                  className="flex-1 bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </SelectControl>
                <SelectControl
                  value={f.op}
                  onChange={(e) => updateFilter(i, {op: e.target.value as ChartFilterOp})}
                  className="bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {FILTER_OPS.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </SelectControl>
                {f.op !== 'is_empty' && f.op !== 'is_not_empty' && (
                  <input
                    type="text"
                    value={f.value ?? ''}
                    onChange={(e) => updateFilter(i, {value: e.target.value})}
                    placeholder="valor"
                    aria-label="Valor del filtro"
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

        {/* Row limit */}
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
      </Collapsible>

            </>
          )}
          
          {activeTab === 'design' && (
            <>
      {/* ============ FUENTE ============ */}
      <Collapsible title="Fuente">
          <div>
            <label className="text-sm font-medium mb-1 block">Fuente raíz del gráfico</label>
            <SelectControl
              value={config.style?.fontFamily ?? ''}
              onChange={(e) => updateStyle({fontFamily: e.target.value || undefined})}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">Sistema (predeterminado)</option>
              {FONT_PRESETS.map((f) => (
                <option key={f.name} value={f.family}>{f.name}</option>
              ))}
            </SelectControl>
          </div>
          <ColorPickerControl label="Color de la fuente general" value={config.style?.textColor} onChange={(v) => updateStyle({textColor: v || undefined})} />
        </Collapsible>

      {/* ============ HEADER ============ */}
      <Collapsible title="Header">
          <div>
            <label className="text-sm font-medium mb-1 block">Título</label>
            <textarea
              value={config.title ?? ''}
              onChange={(e) => update({title: e.target.value})}
              placeholder="Título del gráfico (Enter = nueva línea)"
              rows={2}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Subtítulo</label>
            <textarea
              value={config.subtitle ?? ''}
              onChange={(e) => update({subtitle: e.target.value})}
              placeholder="Subtítulo opcional (Enter = nueva línea)"
              rows={2}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="pt-1 border-t border-border-subtle">
            <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Fuente del título</label>
            <div className="mt-2">
              <TextStyleControls value={config.headerFont} onChange={setHeaderFont} showOverflow />
            </div>
          </div>
          <div className="pt-1 border-t border-border-subtle">
            <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Fuente del subtítulo</label>
            <div className="mt-2">
              <TextStyleControls value={config.subtitleFont} onChange={setSubtitleFont} showOverflow />
            </div>
          </div>
          <LayoutControls
            title="Posición (título + subtítulo)"
            value={{...(config.titleLayout ?? {}), ...(config.subtitleLayout ?? {})}}
            onChange={(patch) => {
              const t0 = config.titleLayout ?? {};
              const s0 = config.subtitleLayout ?? {};
              const t1 = {...t0, ...patch};
              const s1 = {...s0, ...patch};
              for (const k of ['x', 'y'] as const) {
                if (patch[k] != null) {
                  (t1 as Record<string, unknown>)[k] = patch[k] as number;
                  (s1 as Record<string, unknown>)[k] = patch[k] as number;
                }
              }
              update({titleLayout: t1, subtitleLayout: s1});
            }}
          />
        </Collapsible>

      {/* ============ COLORES ============ */}
      <Collapsible title="Colores">
          {/* Palettes */}
          <div>
            <label className="text-sm font-medium mb-1 block">Paleta de colores</label>
            <PalettePicker onSelect={applyPalette} />
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
                    <span className="min-w-0 flex-1 text-xs text-secondary truncate">{li.label}</span>
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

          <ColorPickerControl label="Color de valores negativos" value={config.negativeColor} onChange={(v) => update({negativeColor: v || undefined})} />
        </Collapsible>

      {/* ============ VISUALIZACIÓN (barras / iconos) ============ */}
      <Collapsible title="Visualización">
          {/* Tipo: Barras / Iconos */}
          <div>
            <label className="text-sm font-medium mb-1 block">Tipo</label>
            <div className="flex gap-1">
              {([
                {value: 'bars' as const, label: 'Barras'},
                {value: 'icons' as const, label: 'Iconos'},
              ] as const).map((m) => (
                <button
                  key={m.value}
                  onClick={() => update({iconMode: m.value})}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    (config.iconMode ?? 'bars') === m.value
                      ? 'bg-amber-500 text-black'
                      : 'bg-elevated text-secondary hover:bg-card-hover'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orientación — aplica a barras e iconos */}
          <div>
            <label className="text-sm font-medium mb-1 block">Orientación</label>
            <div className="flex gap-1">
              {[
                {value: false, label: 'Vertical'},
                {value: true, label: 'Horizontal'},
              ].map((m) => (
                <button
                  key={m.label}
                  onClick={() => update({horizontal: m.value})}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    (config.horizontal ?? false) === m.value
                      ? 'bg-amber-500 text-black'
                      : 'bg-elevated text-secondary hover:bg-card-hover'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modo de agrupación — solo cuando hay series */}
          {hasSeries && (
            <div>
              <label className="text-sm font-medium mb-1 block">Modo</label>
              <div className="flex gap-1">
                {[
                  {value: 'grouped' as const, label: 'Agrupadas'},
                  {value: 'grouped-percent' as const, label: 'Agrupadas %'},
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
          )}
        </Collapsible>

      {/* ============ BARRAS — estilo (solo en modo barras) ============ */}
      {(config.iconMode ?? 'bars') !== 'icons' && (
        <Collapsible title="Barras">
          <NumberControl label="Radio de esquinas" value={config.barRadius} min={0} max={24} onChange={(v) => update({barRadius: v})} />
          {(config.groupMode === 'stacked' || config.groupMode === 'stacked-percent') && (
            <div className="grid grid-cols-2 gap-2">
              <NumberControl label="Radio sup. izq." value={config.barRadiusTL} min={0} max={24} onChange={(v) => update({barRadiusTL: v})} />
              <NumberControl label="Radio sup. der." value={config.barRadiusTR} min={0} max={24} onChange={(v) => update({barRadiusTR: v})} />
              <NumberControl label="Radio inf. izq." value={config.barRadiusBL} min={0} max={24} onChange={(v) => update({barRadiusBL: v})} />
              <NumberControl label="Radio inf. der." value={config.barRadiusBR} min={0} max={24} onChange={(v) => update({barRadiusBR: v})} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <NumberControl label="Grosor de borde" value={config.barBorderWidth} min={0} max={6} onChange={(v) => update({barBorderWidth: v})} />
            {(config.barBorderWidth ?? 0) > 0 && (
              <ColorPickerControl label="Color de borde" value={config.barBorderColor} onChange={(v) => update({barBorderColor: v || undefined})} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberControl label="Gap entre barras" value={config.barGap} min={0} max={20} onChange={(v) => update({barGap: v})} />
            <NumberControl label="Gap de categoría" value={config.barCategoryGap} min={0} max={0.4} step={0.01} onChange={(v) => update({barCategoryGap: v})} />
          </div>
        </Collapsible>
        )}

      {/* ============ ICONOS (pictograma) ============ */}
      {config.iconMode === 'icons' && (
        <Collapsible title="Iconos">
          <div>
            <label className="text-sm font-medium mb-1 block">Icono base (SVG)</label>
            <div className="grid grid-cols-7 gap-1">
              {ICON_GLYPH_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => update({iconGlyph: name})}
                  title={name}
                  className={`p-1.5 rounded flex items-center justify-center transition-colors ${
                    !config.iconImage && (config.iconGlyph ?? 'star') === name
                      ? 'bg-amber-500 text-black'
                      : 'bg-elevated text-secondary hover:bg-card-hover'
                  }`}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path d={ICON_GLYPHS[name]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
          <div className="pt-1 border-t border-border-subtle mt-1">
            <label className="text-sm font-medium mb-1 block">Campo de icono del modelo</label>
            <SelectControl
              value={config.iconField ?? ''}
              onChange={(e) => update({iconField: e.target.value || undefined})}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">Sin vincular (usar icono base o personalizado)</option>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectControl>
          </div>
          <div className="pt-1 border-t border-border-subtle mt-1">
            <label className="text-sm font-medium mb-1 block">Icono personalizado (Imagen)</label>
            <div className="flex gap-2 items-center">
              {config.iconImage && (
                <div className="relative w-8 h-8 rounded border border-border-default bg-elevated overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={config.iconImage} alt="Custom Icon" className="w-full h-full object-contain" />
                  <button onClick={() => update({iconImage: undefined})} className="absolute top-0 right-0 bg-red-500 text-white text-[8px] px-1 rounded-bl">✕</button>
                </div>
              )}
              <input type="file" accept="image/*" aria-label="Icono personalizado" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => update({iconImage: ev.target?.result as string});
                reader.readAsDataURL(file);
              }} className="text-xs w-full text-secondary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-black hover:file:bg-amber-400" />
            </div>
          </div>
          {isStackedPercent && (
            <NumberControl
              label="% por icono"
              value={config.iconPercentPerGlyph}
              min={0.1}
              max={100}
              step={1}
              onChange={(v) => update({iconPercentPerGlyph: v})}
            />
          )}
          {!isStackedPercent && (
            <NumberControl
              label="Valor por icono (vacío = auto)"
              value={config.iconUnitsPerGlyph}
              min={1}
              max={1e12}
              step={1}
              onChange={(v) => update({iconUnitsPerGlyph: v || undefined})}
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <NumberControl label="Tamaño" value={config.iconSize} min={6} max={48} onChange={(v) => update({iconSize: v})} />
            <NumberControl label="Separación" value={config.iconPadding} min={0} max={20} onChange={(v) => update({iconPadding: v})} />
          </div>
          <NumberControl label="Máx. por fila" value={config.iconMaxPerRow} min={1} max={50} onChange={(v) => update({iconMaxPerRow: v})} />
        </Collapsible>
      )}

      {/* ============ EJE X / CATEGORÍA ============ */}
      <Collapsible title="Eje X / Categoría">
          <div>
              <label className="text-sm font-medium mb-1 block">Etiquetas de categoría</label>
              <p className="text-[10px] text-muted mb-2">Posición por coordenadas (px) desde un punto fijo del área del gráfico. En barras verticales el ancla es el borde inferior del centro de cada banda; en horizontales, el borde izquierdo del centro de cada fila.</p>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={config.categoryLabelsVisible ?? true}
                  onChange={(e) => update({categoryLabelsVisible: e.target.checked})}
                  className="accent-amber-500 h-4 w-4"
                />
                <span className="text-sm">Mostrar etiquetas</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <NumberControl label="Offset X" value={config.categoryLabelOffsetX ?? 0} step={1} onChange={(v) => update({categoryLabelOffsetX: v})} />
                </div>
                <div>
                  <NumberControl label="Offset Y" value={config.categoryLabelOffsetY ?? 0} step={1} onChange={(v) => update({categoryLabelOffsetY: v})} />
                </div>
              </div>
            </div>

          {catLabels.length > 0 && (
            <div className="pt-1 border-t border-border-subtle">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-sm font-medium block">Etiquetas personalizadas</label>
                {Object.keys(config.categoryTextOverrides ?? {}).length > 0 && (
                  <button
                    type="button"
                    onClick={() => update({categoryTextOverrides: undefined})}
                    className="text-[10px] text-muted hover:text-red-500"
                  >
                    Limpiar todas
                  </button>
                )}
              </div>
              <p className="text-[10px] text-muted mb-1.5">Renombra la etiqueta del eje X y su subtítulo por categoría.</p>
              <div className="space-y-1.5">
                {catLabels.map((label) => {
                  const raw = config.categoryTextOverrides?.[label];
                  const resolved = typeof raw === 'string' ? {label: raw, sub: undefined} : raw;
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-xs text-secondary truncate w-20 shrink-0" title={label}>{label}</span>
                      <input
                        type="text"
                        value={resolved?.label ?? ''}
                        placeholder="Etiqueta"
                        onChange={(e) => setCategoryTextOverride(label, {label: e.target.value, sub: resolved?.sub})}
                        className="flex-1 min-w-0 bg-elevated border border-border-default rounded px-2 py-1 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      {config.categoryDescriptionField && (
                        <input
                          type="text"
                          value={resolved?.sub ?? ''}
                          placeholder="Subtítulo"
                          onChange={(e) => setCategoryTextOverride(label, {label: resolved?.label, sub: e.target.value || undefined})}
                          className="flex-1 min-w-0 bg-elevated border border-border-default rounded px-2 py-1 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      )}
                      {raw && (
                        <button
                          type="button"
                          onClick={() => setCategoryTextOverride(label)}
                          className="text-muted hover:text-red-500 px-1 text-xs"
                          aria-label={`Restablecer etiqueta de ${label}`}
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

          {config.categoryDescriptionField && (
            <div className="pt-1 border-t border-border-subtle">
              <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Fuente de la descripción</label>
              <div className="mt-2">
                <TextStyleControls value={config.categoryDescriptionFont} onChange={setCategoryDescriptionFont} showOverflow />
              </div>
            </div>
          )}
        </Collapsible>

      {/* ============ EJE Y / DATOS ============ */}
      <Collapsible title="Eje Y / Valor">
          {isStackedPercent ? (
            <p className="text-[10px] text-muted py-1">Eje Y fijo en 0%–100% (modo %).</p>
          ) : (
            <>
              <div>
                  <label className="text-sm font-medium mb-1 block">Ordenar por</label>
                  <SelectControl
                    value={config.sortBy ?? 'none'}
                    onChange={(e) => update({sortBy: e.target.value as SortBy})}
                    className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </SelectControl>
                </div>
              <SwitchControl label="Empezar en cero" checked={config.startAtZero ?? true} onChange={(v) => update({startAtZero: v})} />
              <NumberControl label="Cantidad de divisiones (Y)" value={config.tickCount} min={2} max={12} onChange={(v) => update({tickCount: v})} />
              <div className="grid grid-cols-2 gap-2">
                <NumberControl label="Y mín." value={config.yMin} min={-1e9} max={1e9} onChange={(v) => update({yMin: v})} />
                <NumberControl label="Y máx." value={config.yMax} min={-1e9} max={1e9} onChange={(v) => update({yMax: v})} />
              </div>
            </>
          )}

          <SwitchControl label="Mostrar grid" checked={config.showGrid ?? true} onChange={(v) => update({showGrid: v})} />

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
              <p className="text-[10px] text-muted">
                {isStackedPercent
                  ? 'Marcadores en el eje Y (valor en %: 50 = 50%).'
                  : 'Marcadores horizontales en un valor del eje Y (ej: promedio, objetivo).'}
              </p>
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
                  type="number"
                  min={0.5}
                  max={8}
                  step={0.1}
                  value={rl.width ?? 1.2}
                  onChange={(e) => {
                    const next = [...(config.referenceLines ?? [])];
                    const v = Number(e.target.value);
                    next[i] = {...next[i], width: Number.isFinite(v) && v > 0 ? v : undefined};
                    update({referenceLines: next});
                  }}
                  title="Grosor de la línea (px)"
                  className="w-12 bg-elevated border border-border-default rounded-lg px-1.5 py-1 text-[10px] text-right font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
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
        </Collapsible>

      {/* ============ ETIQUETAS ============ */}
      <Collapsible title="Etiquetas">
          <SwitchControl label="Mostrar etiquetas de datos" checked={config.showDataLabels ?? true} onChange={(v) => update({showDataLabels: v})} />
          {(config.showDataLabels ?? true) && (
            <>
              {config.iconMode !== 'icons' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Posición</label>
                  <SelectControl
                    value={config.dataLabelPosition ?? 'auto'}
                    onChange={(e) => update({dataLabelPosition: e.target.value as 'auto' | 'inside' | 'outside' | 'center'})}
                    className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="auto">Automática</option>
                    <option value="outside">Fuera de la barra</option>
                    <option value="center">Centro</option>
                    <option value="inside">Dentro</option>
                  </SelectControl>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Tipografía de etiquetas</label>
                <div className="mt-1.5">
                  <TextStyleControls value={config.dataLabelFont} onChange={setDataLabelFont} showOverflow />
                </div>
              </div>
            </>
          )}
          <div className="pt-1 border-t border-border-subtle">
              <label className="text-sm font-medium mb-1 block">Formato de números</label>
              {isStackedPercent ? (
                <p className="text-[10px] text-muted py-1">Forzado a porcentaje en modo %.</p>
              ) : (
                <SelectControl
                  value={config.numberFormat ?? 'short'}
                  onChange={(e) => update({numberFormat: e.target.value as NumberFormat})}
                  className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {NUMBER_FORMATS.map((nf) => (
                    <option key={nf.value} value={nf.value}>{nf.label}</option>
                  ))}
                </SelectControl>
              )}
            </div>
        </Collapsible>

      {/* ============ LEYENDAS ============ */}
      <Collapsible title="Leyendas">
          <SwitchControl label="Mostrar leyenda" checked={config.showLegend ?? true} onChange={(v) => update({showLegend: v})} />
          {(config.showLegend ?? true) && (
            <>
              <LayoutControls title="Coordenadas libres (offset, px)" value={config.legendLayout} onChange={setLegendLayout} />
            </>
          )}
          <div className="pt-1 border-t border-border-subtle">
            <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Fuente de la leyenda</label>
            <div className="mt-2">
              <TextStyleControls value={config.legendFont} onChange={setLegendFont} hideColor showOverflow />
            </div>
          </div>
          {legendOverrideLabels.length > 0 && (
            <div className="pt-1 border-t border-border-subtle">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-sm font-medium block">Texto de la leyenda</label>
                {Object.keys(config.legendTextOverrides ?? {}).length > 0 && (
                  <button
                    type="button"
                    onClick={() => update({legendTextOverrides: undefined})}
                    className="text-[10px] text-muted hover:text-red-500"
                  >
                    Limpiar todas
                  </button>
                )}
              </div>
              <p className="text-[10px] text-muted mb-1.5">Renombra cada elemento de la leyenda sin cambiar su color ni datos.</p>
              <div className="space-y-1.5">
                {legendOverrideLabels.map((label) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs text-secondary truncate w-24 shrink-0" title={label}>{label}</span>
                    <input
                      type="text"
                      value={legendOverrideValue(label)}
                      placeholder="Texto de leyenda"
                      onChange={(e) => setLegendTextOverride(label, e.target.value || undefined)}
                      className="flex-1 min-w-0 bg-elevated border border-border-default rounded px-2 py-1 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    {legendOverrideValue(label) && (
                      <button
                        type="button"
                        onClick={() => setLegendTextOverride(label)}
                        className="text-muted hover:text-red-500 px-1 text-xs"
                        aria-label={`Restablecer texto de ${label}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Collapsible>

      {/* ============ LIENZO ============ */}
      <Collapsible title="Lienzo">
        <div>
          <label className="text-sm font-medium mb-1 block">Fondo del lienzo</label>
          <div className="flex gap-1 flex-wrap">
            {((['none', 'color', 'pattern', 'gradient', 'image'] as const)).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update({backgroundType: t})}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  (config.backgroundType ?? 'none') === t
                    ? 'bg-amber-500 text-black'
                    : 'bg-elevated text-secondary hover:bg-card-hover'
                }`}
              >
                {({none: 'Ninguno', color: 'Color', pattern: 'Patrón', gradient: 'Degradado', image: 'Imagen'} as Record<string, string>)[t]}
              </button>
            ))}
          </div>
        </div>

        {(config.backgroundType ?? 'none') === 'color' && (
          <ColorPickerControl label="Color de fondo" value={config.background ?? '#0a0a0a'} onChange={(v) => update({background: v || undefined})} />
        )}

        {(config.backgroundType ?? 'none') === 'pattern' && (
          <>
            <div>
              <label className="text-sm font-medium mb-1 block">Patrón</label>
              <SelectControl
                value={config.backgroundPattern ?? 'dots'}
                onChange={(e) => update({backgroundPattern: e.target.value as NonNullable<ChartConfig['backgroundPattern']>})}
                className="w-full bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="dots">Puntos</option>
                <option value="stripes">Rayas</option>
                <option value="grid">Cuadrícula</option>
                <option value="checkers">Cuadros</option>
              </SelectControl>
            </div>
            {config.backgroundPattern === 'stripes' && (
              <SliderNumberInput label="Ángulo (grados)" value={config.backgroundAngle ?? 45} min={0} max={360} step={15} onChange={(v) => update({backgroundAngle: v || undefined})} />
            )}
            <ColorPickerControl label="Color del patrón" value={config.background ?? '#3b82f6'} onChange={(v) => update({background: v || undefined})} />
            <SliderNumberInput label="Opacidad (%)" value={Math.round((config.backgroundOpacity ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => update({backgroundOpacity: v ? v / 100 : undefined})} />
          </>
        )}

        {(config.backgroundType ?? 'none') === 'gradient' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <ColorPickerControl label="Color inicial" value={config.background ?? '#0a0a0a'} onChange={(v) => update({background: v || undefined})} />
              <ColorPickerControl label="Color final" value={config.backgroundSecondary ?? '#1f2937'} onChange={(v) => update({backgroundSecondary: v || undefined})} />
            </div>
            <SliderNumberInput label="Ángulo (grados)" value={config.backgroundAngle ?? 135} min={0} max={360} step={15} onChange={(v) => update({backgroundAngle: v || undefined})} />
            <SliderNumberInput label="Distribución inicio→fin (%)" value={Math.round((config.backgroundGradientDist ?? 0) * 100)} min={0} max={100} step={5} onChange={(v) => update({backgroundGradientDist: v / 100})} />
            <SliderNumberInput label="Opacidad (%)" value={Math.round((config.backgroundOpacity ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => update({backgroundOpacity: v ? v / 100 : undefined})} />
          </>
        )}

        {(config.backgroundType ?? 'none') === 'image' && (
          <>
            <FileUploadInput label="Imagen de fondo" value={config.backgroundImage} onLoad={(dataUrl) => update({backgroundImage: dataUrl})} onClear={() => update({backgroundImage: undefined})} />
            <div>
              <label className="text-sm font-medium mb-1 block">Ajuste</label>
              <SelectControl
                value={config.backgroundFit ?? 'cover'}
                onChange={(e) => update({backgroundFit: e.target.value as NonNullable<ChartConfig['backgroundFit']>})}
                className="w-full bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="cover">Cubrir</option>
                <option value="contain">Contener</option>
                <option value="fill">Rellenar</option>
              </SelectControl>
            </div>
            <ColorPickerControl label="Color base (debajo)" value={config.background ?? '#0a0a0a'} onChange={(v) => update({background: v || undefined})} />
            <SliderNumberInput label="Opacidad (%)" value={Math.round((config.backgroundOpacity ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => update({backgroundOpacity: v ? v / 100 : undefined})} />
          </>
        )}

        <SliderNumberInput label="Desenfoque del fondo (blur px)" value={config.backgroundBlur ?? 0} min={0} max={30} step={1} onChange={(v) => update({backgroundBlur: v || undefined})} />

        <div className="pt-1 border-t border-border-subtle">
          <div className="grid grid-cols-2 gap-2 mt-2">
            <NumberControl label="Borde (grosor)" value={config.canvasBorderWidth} min={0} max={8} onChange={(v) => update({canvasBorderWidth: v})} />
            {(config.canvasBorderWidth ?? 0) > 0 && (
              <ColorPickerControl label="Borde (color)" value={config.canvasBorderColor} onChange={(v) => update({canvasBorderColor: v || undefined})} />
            )}
          </div>
          <NumberControl label="Radio de esquinas del lienzo" value={config.canvasBorderRadius} min={0} max={40} onChange={(v) => update({canvasBorderRadius: v})} />
        </div>
      </Collapsible>

      {/* ============ ESPACIADO ============ */}
      <Collapsible title="Espaciado">
        <SliderNumberInput
          label="Header (abajo)"
          value={config.spacing?.headerPadding ?? 0}
          min={0}
          max={60}
          onChange={(v) => update({spacing: {...(config.spacing ?? {}), headerPadding: v}})}
        />
        <SliderNumberInput
          label="Leyenda"
          value={config.spacing?.legendSpacing ?? 0}
          min={0}
          max={40}
          onChange={(v) => update({spacing: {...(config.spacing ?? {}), legendSpacing: v}})}
        />
        <div className="pt-1 border-t border-border-subtle mt-2">
          <SliderNumberInput
            label="Margen superior"
            value={config.spacing?.plotMarginTop ?? 24}
            min={0}
            max={100}
            onChange={(v) => update({spacing: {...(config.spacing ?? {}), plotMarginTop: v}})}
          />
          <SliderNumberInput
            label="Margen derecho"
            value={config.spacing?.plotMarginRight ?? 40}
            min={0}
            max={100}
            onChange={(v) => update({spacing: {...(config.spacing ?? {}), plotMarginRight: v}})}
          />
          <SliderNumberInput
            label="Margen inferior"
            value={config.spacing?.plotMarginBottom ?? 66}
            min={0}
            max={100}
            onChange={(v) => update({spacing: {...(config.spacing ?? {}), plotMarginBottom: v}})}
          />
          <SliderNumberInput
            label="Margen izquierdo"
            value={config.spacing?.plotMarginLeft ?? 84}
            min={0}
            max={100}
            onChange={(v) => update({spacing: {...(config.spacing ?? {}), plotMarginLeft: v}})}
          />
        </div>
      </Collapsible>

      {/* ============ AVATAR ============ */}
      <Collapsible title="Avatar">
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
                    {value: 'rounded', label: 'Esquinas redondeadas'},
                    {value: 'circle', label: 'Círculo'},
                  ] as {value: AvatarShape; label: string}[]).map((s) => (
                    <button
                      key={s.value}
                      onClick={() => update({avatarShape: s.value})}
                      className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                        (config.avatarShape ?? 'rounded') === s.value
                          ? 'bg-amber-500 text-black'
                          : 'bg-elevated text-secondary hover:bg-card-hover'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <NumberControl label="Tamaño" value={config.avatarSize} min={8} max={128} step={2} onChange={(v) => update({avatarSize: v})} />
              {(config.avatarShape ?? 'rounded') === 'rounded' && (
                <NumberControl label="Radio de esquina (vacío = auto)" value={config.avatarRadius} min={0} max={40} step={1} onChange={(v) => update({avatarRadius: v})} />
              )}
              <div>
                <label className="text-sm font-medium mb-1 block">Fondo del avatar</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={config.avatarBg && config.avatarBg !== 'transparent' ? config.avatarBg : '#1f2937'}
                    onChange={(e) => update({avatarBg: e.target.value})}
                    className="h-8 w-8 rounded border border-border-default cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => update({avatarBg: 'transparent'})}
                    className={`text-xs px-2 py-1 rounded border ${
                      (!config.avatarBg || config.avatarBg === 'transparent')
                        ? 'border-amber-500 text-amber-400'
                        : 'border-border-default text-muted hover:text-primary'
                    }`}
                  >
                    Transparente
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Borde del avatar</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={config.avatarBorderColor ?? '#ffffff'}
                    onChange={(e) => update({avatarBorderColor: e.target.value})}
                    className="h-8 w-8 rounded border border-border-default cursor-pointer"
                  />
                  <input
                    type="number"
                    min={0} max={16} step={1}
                    value={config.avatarBorderWidth ?? ''}
                    placeholder="Grosor (px)"
                    onChange={(e) => update({avatarBorderWidth: e.target.value ? Number(e.target.value) : undefined})}
                    className="w-24 bg-elevated border border-border-default rounded-lg px-2 py-1 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <p className="text-[10px] text-muted mt-0.5">Color y grosor en px (0 = sin borde).</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Posición (coordenadas, px)</label>
                <div className="grid grid-cols-2 gap-2">
                  <NumberControl label="Offset X" value={config.avatarOffsetX} step={1} onChange={(v) => update({avatarOffsetX: v})} />
                  <NumberControl label="Offset Y" value={config.avatarOffsetY} step={1} onChange={(v) => update({avatarOffsetY: v})} />
                </div>
                <p className="text-[10px] text-muted pt-1">Desplazamiento global en px desde un punto FIJO del área del gráfico (el borde izquierdo en cada fila en horizontal; el borde superior en cada columna en vertical). Desacoplado de la barra: el tamaño/posición del avatar no mueve las barras ni el plot, y el layout de barras no lo afecta.</p>
              </div>
              {catLabels.length > 0 && (
                <div className="pt-2 border-t border-border-subtle">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-sm font-medium block">Ajustar avatares por categoría</label>
                    {Object.keys(config.avatarCrops ?? {}).length > 0 && (
                      <button type="button" onClick={() => update({avatarCrops: undefined})} className="text-[10px] text-muted hover:text-red-500">
                        Limpiar todas
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted mb-1.5">Zoom y foco del recorte dentro del marco de cada avatar.</p>
                  <div className="space-y-2">
                    {catLabels.map((label) => {
                      const cr = config.avatarCrops?.[label];
                      const imgUrl = categoryImageMap.get(label);
                      const zoom = Math.max(cr?.zoom ?? 1, 0.1);
                      const fx = Math.max(Math.min(cr?.focusX ?? 0, 1), -1);
                      const fy = Math.max(Math.min(cr?.focusY ?? 0, 1), -1);
                      const PREVIEW = 44;
                      const posScale = PREVIEW / 2 - (PREVIEW * zoom) / 2;
                      const imgStyle = imgUrl
                        ? {
                            width: PREVIEW * zoom,
                            height: PREVIEW * zoom,
                            transform: `translate(${posScale + fx * (PREVIEW * zoom - PREVIEW) / 2}px, ${posScale + fy * (PREVIEW * zoom - PREVIEW) / 2}px)`,
                          }
                        : undefined;
                      const clipStyle = imgUrl
                        ? {
                            width: PREVIEW,
                            height: PREVIEW,
                            borderRadius: (config.avatarShape ?? 'rounded') === 'circle' ? '50%' : `${PREVIEW * 0.25}px`,
                            overflow: 'hidden' as const,
                            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)',
                          }
                        : undefined;
                      return (
                        <div key={label} className="border border-border-subtle rounded p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-secondary truncate" title={label}>{label}</span>
                            {cr && (
                              <button type="button" onClick={() => setAvatarCrop(label)} className="text-muted hover:text-red-500 text-xs" aria-label={`Resetear recorte de ${label}`}>✕</button>
                            )}
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-1">
                              {imgUrl ? (
                                <div style={clipStyle}>
                                  <img src={imgUrl} alt="" style={{...imgStyle, objectFit: 'contain', maxWidth: 'none'}} />
                                </div>
                              ) : (
                                <div style={{...clipStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)'}}>
                                  <span className="text-muted">sin img</span>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2 flex-1">
                              <NumberControl label="Zoom" value={cr?.zoom} min={0.1} max={3} step={0.05} onChange={(v) => setAvatarCrop(label, {...cr, zoom: v})} />
                              <NumberControl label="Foco X" value={cr ? (cr.focusX ?? 0) * 100 : 0} min={-100} max={100} step={5} onChange={(v) => setAvatarCrop(label, {...cr, focusX: (v ?? 0) / 100})} />
                              <NumberControl label="Foco Y" value={cr ? (cr.focusY ?? 0) * 100 : 0} min={-100} max={100} step={5} onChange={(v) => setAvatarCrop(label, {...cr, focusY: (v ?? 0) / 100})} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted">Las imágenes se muestran en el preview y en el SVG descargado; puede que no aparezcan al exportar a PNG.</p>
            </>
          )}
        </Collapsible>

      {/* ============ ADICIONALES ============ */}
      <Collapsible title="Adicionales">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => update({overlays: [...(config.overlays ?? []), {id: newOverlayId(), type: 'text', text: 'Texto', layout: {x: 20, y: 20}}]})}
              className="px-2 py-1.5 rounded text-xs font-medium transition-colors bg-elevated text-secondary hover:bg-card-hover text-center"
            >
              + Texto
            </button>
            <button
              type="button"
              onClick={() => update({overlays: [...(config.overlays ?? []), {id: newOverlayId(), type: 'image', x: 20, y: 20, width: 80, height: 80}]})}
              className="px-2 py-1.5 rounded text-xs font-medium transition-colors bg-elevated text-secondary hover:bg-card-hover text-center"
            >
              + Imagen
            </button>
            <button
              type="button"
              onClick={() => update({overlays: [...(config.overlays ?? []), {id: newOverlayId(), type: 'shape', shape: 'rect', fill: '#f59e0b', x: 20, y: 20, width: 80, height: 80}]})}
              className="px-2 py-1.5 rounded text-xs font-medium transition-colors bg-elevated text-secondary hover:bg-card-hover text-center"
            >
              + Forma
            </button>
          </div>
          {(config.overlays ?? []).length === 0 && (
            <p className="text-[10px] text-muted">Capas libres sobre el lienzo (formas, imágenes o textos) con control de opacidad, desenfoque y orden (frente/detrás).</p>
          )}
          {(config.overlays ?? []).map((ov, i) => (
            <OverlayEditor
              key={ov.id}
              overlay={ov}
              index={i}
              variant="static"
              onPatch={(patch) => setOverlay(i, patch)}
              onRemove={() => {
                const next = [...(config.overlays ?? [])];
                next.splice(i, 1);
                update({overlays: next});
              }}
            />
          ))}
        </Collapsible>
            </>
          )}
        </div>
      )}
    </Tabs>
  );
}

function LayoutControls({title, value, onChange}: {title: string; value?: TextLayout; onChange: (patch: Partial<TextLayout>) => void}) {
  const set = (patch: Partial<TextLayout>) => onChange(patch);
  return (
    <div className="pt-3 border-t border-border-subtle">
      <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">{title}</label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm font-medium mb-1 block">Ancla</label>
          <SelectControl
            value={value?.anchor ?? 'center'}
            onChange={(e) => set({anchor: e.target.value as TextLayout['anchor']})}
            className="w-full bg-elevated border border-border-default rounded-lg px-2 py-1 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="left">Izquierda</option>
            <option value="center">Centro</option>
            <option value="right">Derecha</option>
          </SelectControl>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Alineación</label>
          <SelectControl
            value={value?.align ?? 'center'}
            onChange={(e) => set({align: e.target.value as TextLayout['align']})}
            className="w-full bg-elevated border border-border-default rounded-lg px-2 py-1 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="left">Izquierda</option>
            <option value="center">Centro</option>
            <option value="right">Derecha</option>
          </SelectControl>
        </div>
        <NumberControl label="X (px)" value={value?.x} onChange={(v) => set({x: v})} />
        <NumberControl label="Y (px)" value={value?.y} onChange={(v) => set({y: v})} />
        <NumberControl label="Rotación (°)" value={value?.rotation} min={-180} max={180} onChange={(v) => set({rotation: v})} />
        <NumberControl label="Espaciado (px)" value={value?.letterSpacing} min={-4} max={20} step={0.5} onChange={(v) => set({letterSpacing: v})} />
        <NumberControl label="Opacidad" value={value?.opacity} min={0} max={1} step={0.05} onChange={(v) => set({opacity: v})} />
        <NumberControl label="Alto línea" value={value?.lineHeight} min={0} max={80} step={0.5} onChange={(v) => set({lineHeight: v})} />
        <div className="col-span-2">
          <label className="text-sm font-medium mb-1 block">Color de fondo (caja)</label>
          <input
            type="color"
            value={value?.bgColor ?? '#000000'}
            onChange={(e) => set({bgColor: e.target.value})}
            className="w-10 h-8 rounded cursor-pointer border border-border-default bg-transparent"
            aria-label="Color de fondo del título"
          />
        </div>
        <NumberControl label="Padding caja" value={value?.bgPadding} min={0} max={40} onChange={(v) => set({bgPadding: v})} />
        <NumberControl label="Radio caja" value={value?.bgRadius} min={0} max={40} onChange={(v) => set({bgRadius: v})} />
        <NumberControl label="Opac. caja" value={value?.bgOpacity} min={0} max={1} step={0.05} onChange={(v) => set({bgOpacity: v})} />
      </div>
    </div>
  );
}
