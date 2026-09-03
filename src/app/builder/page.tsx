'use client';

import {Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {
  BarChart3,
  Film,
  Play,
  Save,
  Check,
  Table2,
  SlidersHorizontal,
  Clapperboard,
  ChevronRight,
  Database,
  ArrowLeft,
  Download,
} from 'lucide-react';
import type {QuerySpec} from '@/lib/query-spec';
import {defaultQuerySpec} from '@/lib/query-spec';
import type {ChartConfig} from '@/lib/chart-config';
import {DEFAULT_CHART_CONFIG, applyChartDefaults} from '@/lib/chart-config';
import type {SchemaMetadata} from '@/lib/schema-metadata';
import {getSchemaMetadata, getTableDepth, isNumericType} from '@/lib/schema-metadata';
import {suggestBestTemplate, convertToRemotionProps} from '@/lib/viz-to-remotion';
import {applyChartFilters} from '@/lib/chart-data';
import {chartToDataUrl} from '@/lib/export-static';
import dynamic from 'next/dynamic';
import {ChartConfigPanel} from '@/components/builder/chart-config-panel';
import type {ColumnMeta} from '@/components/builder/chart-config-panel';
import {ChartPreview} from '@/components/charts/chart-preview';
import CanvasZoom from '@/components/builder/static-canvas';
import {TemplatePicker} from '@/components/builder/template-picker';
import {AnimationPreview} from '@/components/builder/animation-preview';
import {AnimationConfigPanel} from '@/components/builder/animation-config-panel';
import {BuilderNav} from '@/components/builder/builder-nav';
import {ExportPanel} from '@/components/builder/export-panel';
import {TEMPLATES} from '@/remotion/generated/registry';
import type {TemplateId} from '@/remotion/generated/registry';
import type {AnimationTemplateConfig, TimelineRaceConfig} from '@/lib/animation-config';
import {emptyAnimationConfig} from '@/lib/animation-config';
import {useToast} from '@/components/ui/toast';

const QueryCanvas = dynamic(
  () => import('@/components/canvas/query-canvas').then((m) => m.QueryCanvas),
  {ssr: false, loading: () => (
    <div className="h-full flex items-center justify-center text-muted text-sm font-body">
      Cargando canvas...
    </div>
  )},
);

type OutputMode = 'static' | 'animated';
type View = 'data' | 'result';

const STEPS = [
  {n: 1, label: 'Datos', icon: Database},
  {n: 2, label: 'Configurar', icon: SlidersHorizontal},
  {n: 3, label: 'Exportar', icon: Clapperboard},
] as const;

export default function BuilderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-muted font-body">
        Cargando builder...
      </div>
    }>
      <BuilderContent />
    </Suspense>
  );
}

function BuilderContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const templateParam = searchParams.get('template');
  const shareParam = searchParams.get('share');
  const {addToast} = useToast();
  const [spec, setSpec] = useState<QuerySpec>(defaultQuerySpec(''));
  const [chartConfig, setChartConfig] = useState<ChartConfig>(DEFAULT_CHART_CONFIG);
  const [vizName, setVizName] = useState('Nueva visualización');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuery, setPendingQuery] = useState(false);
  const [resultTruncated, setResultTruncated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<View>('data');
  const [resultStep, setResultStep] = useState<2 | 3>(2);
  const [outputMode, setOutputMode] = useState<OutputMode>(
    templateParam ? 'animated' : 'static',
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(templateParam);
  const [meta, setMeta] = useState<SchemaMetadata | null>(null);

  const [duration, setDuration] = useState(10);
  const [templateConfig, setTemplateConfig] = useState<AnimationTemplateConfig>(emptyAnimationConfig());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editIdRef = useRef<string | null>(editId);
  editIdRef.current = editId;
  const durationLoadedRef = useRef(false);
  const templateDeselectRef = useRef(false);
  const staticExportRef = useRef<HTMLDivElement | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosavedOnceRef = useRef(false);

  // Derived template state (must be before effects that reference activeTemplate)
  const bestTemplate = outputMode === 'animated' && data.length > 0
    ? suggestBestTemplate(chartConfig, data)
    : null;
  const activeTemplate = selectedTemplate ?? bestTemplate;
  const templateEntry = activeTemplate ? TEMPLATES[activeTemplate as TemplateId] : null;

  // Load schema metadata
  useEffect(() => {
    getSchemaMetadata()
      .then(setMeta)
      .catch((e) => setError(e.message));
  }, []);

  const executeQuery = useCallback(async (q: QuerySpec) => {
    if (!q.table) return;
    setLoading(true);
    setError(null);
    setResultTruncated(false);
    try {
      // Capture the full result set by walking OFFSET pages. A user-set
      // `limit` caps the total captured; otherwise we page through everything
      // up to a safety ceiling (ABS_MAX) to avoid memory blowups.
      const PAGE = 1000;
      const ABS_MAX = 50000;
      const userLimit = q.limit && q.limit > 0 ? q.limit : Infinity;
      const cap = Math.min(ABS_MAX, userLimit);
      const pageSize = Number.isFinite(cap) ? Math.min(PAGE, cap) : PAGE;

      const all: Record<string, unknown>[] = [];
      let offset = 0;
      while (all.length < cap) {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({spec: {...q, limit: pageSize, offset}}),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Error executing query');
        const rows: Record<string, unknown>[] = json.data ?? [];
        all.push(...rows);
        // Natural end of data.
        if (rows.length < pageSize) break;
        offset += pageSize;
      }

      // Warn only when we hit the safety ceiling, not when the user chose a limit.
      if (!Number.isFinite(userLimit) && all.length >= ABS_MAX) {
        setResultTruncated(true);
      }
      setData(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load saved viz_spec when editing
  useEffect(() => {
    if (!editId) return;
    fetch(`/api/viz-specs/${editId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.query_spec) {
          setSpec(d.query_spec);
          // Re-run the query so the dataset isn't empty after a reload.
          executeQuery(d.query_spec);
        }
        if (d.chart_config) setChartConfig(d.chart_config);
        if (d.name) setVizName(d.name);
        if (d.animation_config) {
          const ac = d.animation_config;
          if (ac.templateId) {
            setSelectedTemplate(ac.templateId);
            setOutputMode('animated');
          }
          if (ac.duration) {
            setDuration(ac.duration);
            durationLoadedRef.current = true;
          }
          if (ac.templateConfig) {
            setTemplateConfig({...emptyAnimationConfig(), ...ac.templateConfig});
          }
        }
        setSaved(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error loading viz_spec'));
  }, [editId, executeQuery]);

  // U2: Restore state from share URL param
  useEffect(() => {
    if (!shareParam) return;
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(shareParam)));
      if (decoded.spec) {
        setSpec(decoded.spec);
        // Re-run the query so the shared dataset populates immediately.
        executeQuery(decoded.spec);
      }
      if (decoded.chartConfig) setChartConfig(decoded.chartConfig);
      // Clear the share param from URL
      window.history.replaceState(null, '', '/builder');
    } catch {
      // Invalid share param, ignore
    }
  }, [shareParam, executeQuery]);

  // Initialize duration from template default when template changes
  useEffect(() => {
    if (activeTemplate && !durationLoadedRef.current) {
      const entry = TEMPLATES[activeTemplate as TemplateId];
      if (entry) setDuration(entry.meta.defaultDuration);
    }
    durationLoadedRef.current = false;
  }, [activeTemplate]);

  const handleSpecChange = useCallback(
    (newSpec: QuerySpec) => {
      setSpec(newSpec);
      setSaved(false);
      setPendingQuery(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        executeQuery(newSpec);
        setPendingQuery(false);
      }, 800);
    },
    [executeQuery],
  );

  // Manual execute
  const handleRunQuery = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    executeQuery(spec);
    setPendingQuery(false);
  }, [executeQuery, spec]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // E2E: Auto-map chart fields on first non-empty data (fixes the "sin datos
  // numéricos" dead-end on open). Only applies once, so it never overrides a
  // user's manual field selection.
  const autoMappedRef = useRef(false);
  useEffect(() => {
    if (autoMappedRef.current || data.length === 0) return;
    const cols = Object.keys(data[0] ?? {});
    if (cols.length === 0) return;
    const next: Partial<ChartConfig> = {};
    if (!chartConfig.xField) {
      next.xField = cols.find((c) => {
        const v = data[0]?.[c];
        return typeof v !== 'number' && (typeof v !== 'string' || isNaN(Number(v)));
      }) ?? cols[0];
    }
    if (!chartConfig.yField) {
      next.yField = cols.find((c) => {
        const v = data[0]?.[c];
        return typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v !== '');
      }) ?? (next.xField !== cols[1] ? cols[1] : cols[0]);
    }
    if (next.xField || next.yField) {
      setChartConfig((prev) => applyChartDefaults({...prev, ...next}));
    }
    autoMappedRef.current = true;
  }, [data, chartConfig.xField, chartConfig.yField]);

  // E2E: Auto-save draft when there is a table selected and unsaved changes,
  // debounced after the query settles. Writes auto_saved_at + is_draft.
  const persistDraft = useCallback(async () => {
    if (!spec.table || spec.select?.length === 0) return;
    const isEdit = !!editIdRef.current;
    try {
      const url = isEdit ? `/api/viz-specs/${editIdRef.current}` : '/api/viz-specs';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: vizName,
          query_spec: spec,
          chart_config: chartConfig,
          animation_config: outputMode === 'animated' && activeTemplate
            ? {templateId: activeTemplate, duration, templateConfig: Object.keys(templateConfig).length > 0 ? templateConfig : null}
            : null,
          is_draft: true,
        }),
      });
      if (!res.ok) return;
      const created = await res.json();
      if (!isEdit && created?.id) {
        editIdRef.current = created.id;
        window.history.replaceState(null, '', `/builder?edit=${created.id}`);
      }
      autosavedOnceRef.current = true;
    } catch {
      // Silent — autosave is best-effort
    }
  }, [spec, vizName, chartConfig, outputMode, activeTemplate, duration, templateConfig]);

  useEffect(() => {
    if (saved || !spec.table || spec.select?.length === 0) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      persistDraft();
    }, 3000);
    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    };
  }, [spec, saved, chartConfig, vizName, persistDraft]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (saved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saved]);

  // C17: Re-apply URL template param when switching back to animated mode
  // (only if user hasn't explicitly deselected a template)
  useEffect(() => {
    if (outputMode === 'animated' && templateParam && !selectedTemplate && !templateDeselectRef.current) {
      setSelectedTemplate(templateParam);
    }
  }, [outputMode, templateParam, selectedTemplate]);

  const handleSave = async () => {
    if (!spec.select || spec.select.length === 0) {
      addToast('Selecciona al menos una columna en el canvas antes de guardar', 'error');
      return;
    }
    setSaving(true);
    try {
      // Best-effort thumbnail: rasterize the static chart (if visible) so the
      // gallery can show a preview. Non-fatal on failure.
      let thumbnailUrl: string | undefined;
      if (outputMode === 'static' && staticExportRef.current && filteredData.length > 0) {
        try {
          const dataUrl = await chartToDataUrl(staticExportRef.current);
          if (dataUrl) {
            const thumbRes = await fetch('/api/thumbnail', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({dataUrl}),
            });
            const thumb = await thumbRes.json();
            if (thumbRes.ok && thumb.url) thumbnailUrl = thumb.url;
          }
        } catch {
          // Thumbnail is best-effort
        }
      }

      const isEdit = !!editIdRef.current;
      const url = isEdit ? `/api/viz-specs/${editIdRef.current}` : '/api/viz-specs';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: vizName,
          query_spec: spec,
          chart_config: chartConfig,
          animation_config: outputMode === 'animated' && activeTemplate
            ? {templateId: activeTemplate, duration, templateConfig: Object.keys(templateConfig).length > 0 ? templateConfig : null}
            : null,
          thumbnail_url: thumbnailUrl,
          is_draft: false,
          version_bump: true,
        }),
      });
      if (!res.ok) throw new Error('Error saving');
      setSaved(true);
      addToast('Guardado correctamente', 'success');
      // If newly created, update the URL to edit mode
      if (!isEdit) {
        const created = await res.json();
        if (created?.id) {
          editIdRef.current = created.id;
          window.history.replaceState(null, '', `/builder?edit=${created.id}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      addToast(`Error al guardar: ${msg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Column selector source of truth: the columns the user selected on the
  // canvas (persisted in spec.select), not the raw keys of the first query
  // row. This keeps the config chart/animation selector in sync with the
  // selected columns across all joined tables. Falls back to the result keys
  // only when nothing specific was selected (the `*` wildcard path).
  const selectedColumns = (spec.select ?? [])
    .filter((f) => f.column !== '*')
    .map((f) => f.alias ?? f.column);
  const columns =
    selectedColumns.length > 0
      ? selectedColumns
      : data.length > 0
        ? Object.keys(data[0])
        : [];

  // Step-2 post-capture filters applied to the raw dataset before any preview
  // renders, so static charts and animated templates stay consistent.
  const filteredData = useMemo(
    () => applyChartFilters(data, chartConfig.filters ?? []),
    [data, chartConfig.filters],
  );

  // Compute Remotion input props for the animated preview/export from the
  // user's query data (the canonical template data feature was removed).
  const remotionProps = useMemo(
    () => (activeTemplate && filteredData.length > 0
      ? convertToRemotionProps(chartConfig, filteredData, activeTemplate, templateConfig)?.props ?? null
      : null),
    [chartConfig, filteredData, activeTemplate, templateConfig],
  );

  // Fan-out metadata for the step-2 chart panel. `aliasToTable` maps each
  // selected column (by alias or bare name) back to its source table, so the
  // config panel can warn when an aggregate is applied to a shallower table in
  // a fan-out JOIN graph. `fanOutTables` are the tables whose rows get
  // multiplied by deeper joins (i.e. not a max-depth leaf). `fieldMeta`
  // carries per-column type + origin so the axis selectors can filter by type
  // and label each option with its table.
  const {aliasToTable, fanOutTables, fieldMeta} = useMemo(() => {
    const aliasMap: Record<string, string> = {};
    const fieldList: ColumnMeta[] = [];
    for (const f of spec.select ?? []) {
      if (f.column === '*') continue;
      const dotIdx = f.column.indexOf('.');
      if (dotIdx <= 0) continue;
      const tableName = f.column.slice(0, dotIdx);
      const colName = f.column.slice(dotIdx + 1);
      const alias = f.alias ?? f.column;
      aliasMap[alias] = tableName;
      aliasMap[colName] = tableName;
      aliasMap[f.column] = tableName;

      let isNumeric = false;
      const col = meta?.tables
        .find((t) => t.name === tableName)
        ?.columns.find((c) => c.name === colName);
      if (col) isNumeric = isNumericType(col.type);
      fieldList.push({alias, table: tableName, name: colName, isNumeric});
    }

    let fanOut: string[] = [];
    const joins = spec.joins ?? [];
    if (joins.length > 0 && (spec.select?.length ?? 0) > 0 && meta) {
      const depth = getTableDepth(meta.tables, spec);
      const depths = Object.values(depth);
      if (depths.length > 0) {
        const maxDepth = Math.max(...depths);
        fanOut = Object.entries(depth)
          .filter(([, d]) => d < maxDepth)
          .map(([t]) => t);
      }
    }
    return {aliasToTable: aliasMap, fanOutTables: fanOut, fieldMeta: fieldList};
  }, [spec, meta]);


  // Stepper derived state — honest active/done per step
  const stepDone = (n: number) => {
    if (n === 1) return !!spec.table && (spec.select?.length ?? 0) > 0;
    if (n === 2) return data.length > 0 && !!chartConfig.type;
    return outputMode === 'static' ? data.length > 0 : !!activeTemplate;
  };
  const stepActive = (n: number) =>
    n === 1 ? view === 'data' : view === 'result' && resultStep === n;

  const statusText = !spec.table
    ? 'Arrastrá una tabla desde la lista al canvas'
    : data.length === 0
      ? 'Elegí columnas y presioná Ejecutar'
      : view === 'data'
        ? 'Datos listos → avanzá a Configurar'
        : 'Revisá y exportá tu visualización';

  const goResult = (n: 2 | 3) => {
    setResultStep(n);
    setView('result');
  };

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-border-default bg-background shrink-0">
        <div className="flex items-center gap-3">
          <BuilderNav />
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <input
            type="text"
            value={vizName}
            onChange={(e) => setVizName(e.target.value)}
            className="bg-elevated border border-border-default rounded-lg px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-500 w-40 md:w-64"
            aria-label="Nombre de la visualización"
          />
          {pendingQuery && (
            <button
              onClick={handleRunQuery}
              className="px-3 h-9 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
              aria-label="Ejecutar consulta"
            >
              <Play size={14} /> Ejecutar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !spec.table}
            className="px-4 h-9 bg-amber-500 hover:bg-amber-400 disabled:bg-elevated disabled:text-muted rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
            aria-label={saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar visualización'}
          >
            <Save size={14} />
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
      </header>

      {/* Stepper strip */}
      <nav className="flex items-center gap-1 px-6 h-12 border-b border-border-default bg-card/60 text-micro shrink-0" aria-label="Progreso del builder">
        {STEPS.map((step, idx) => {
          const done = stepDone(step.n);
          const active = stepActive(step.n);
          const Icon = step.icon;
          return (
            <span key={step.n} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight size={14} className="text-muted" />}
              <button
                onClick={() => {
                  if (step.n === 1) setView('data');
                  else goResult(step.n as 2 | 3);
                }}
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md transition-colors font-display font-semibold ${
                  active
                    ? 'bg-amber-500/15 text-amber-500'
                    : done
                      ? 'text-secondary hover:bg-card-hover'
                      : 'text-muted hover:text-secondary hover:bg-card-hover'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                    done ? 'bg-amber-500 text-black' : active ? 'bg-amber-500/20 text-amber-500' : 'bg-elevated text-muted'
                  }`}
                >
                  {done ? <Check size={9} /> : <Icon size={9} />}
                </span>
                {step.label}
              </button>
            </span>
          );
        })}
        <span className="ml-auto hidden lg:block text-muted text-[10px] font-body">{statusText}</span>
      </nav>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Central area */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background">
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 h-9 border-b border-border-default text-[11px] text-muted font-body shrink-0">
            <span className="flex items-center gap-1.5">
              {spec.table ? (
                <>
                  <Table2 size={12} className="text-amber-500" />
                  {spec.table} → {data.length} filas
                </>
              ) : (
                'Selecciona una tabla para comenzar'
              )}
            </span>
            <div className="flex items-center gap-3">
              {resultTruncated && <span className="text-amber-600">Se capturaron hasta 50.000 filas</span>}
              {loading && <span className="text-amber-500">Consultando...</span>}
              {error && <span className="text-red-500">{error}</span>}
            </div>
          </div>

          {/* Data canvas OR live result */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {view === 'data' ? (
              meta ? (
                <QueryCanvas spec={spec} onChange={handleSpecChange} meta={meta.tables} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="space-y-3 animate-pulse w-full max-w-sm px-6">
                    <div className="h-8 bg-elevated rounded-lg" />
                    <div className="h-8 bg-elevated rounded-lg" />
                    <div className="h-20 bg-elevated rounded-lg" />
                  </div>
                </div>
              )
            ) : outputMode === 'static' ? (
              <CanvasZoom contentWidth={chartConfig.width ?? 600} contentHeight={chartConfig.height ?? 380}>
                <div ref={staticExportRef} className="w-full">
                  {filteredData.length === 0 ? (
                    <div className="text-center text-muted text-sm font-body p-6">
                      {data.length > 0
                        ? 'Ninguna fila coincide con el filtro del gráfico'
                        : 'Cargá datos en el canvas para ver tu gráfico'}
                    </div>
                  ) : (
                    <ChartPreview data={filteredData} config={chartConfig} />
                  )}
                </div>
              </CanvasZoom>
            ) : activeTemplate ? (
              <AnimationPreview
                templateId={activeTemplate}
                data={filteredData}
                config={chartConfig}
                duration={duration}
                showExportBar={false}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted text-sm font-body">
                Seleccioná un template para previsualizar
              </div>
            )}
          </div>
        </main>

        {/* Right config panel — step 2 (Configurar): full config sidebar */}
        {view === 'result' && resultStep === 2 && (
        <aside className="fixed inset-x-0 bottom-12 z-10 mx-2 mb-2 h-[58vh] rounded-xl border border-border-default flex flex-col overflow-hidden bg-card md:static md:inset-auto md:mx-0 md:mb-0 md:h-auto md:w-[22rem] md:shrink-0 md:rounded-none md:border-x-0 md:border-b-0 md:border-t lg:md:w-96">
          <div className="flex items-center gap-2 px-4 h-10 border-b border-border-default shrink-0">
            <SlidersHorizontal size={14} className="text-amber-500" />
            <span className="text-micro font-semibold text-secondary uppercase tracking-widest font-display">
              Configuración
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Output mode toggle */}
            <div>
              <label className="text-micro font-semibold text-muted uppercase tracking-widest mb-2 block font-display">
                Modo de salida
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => {
                    templateDeselectRef.current = true;
                    setOutputMode('static');
                  }}
                  aria-pressed={outputMode === 'static'}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    outputMode === 'static'
                      ? 'bg-amber-500 text-black'
                      : 'bg-elevated text-secondary hover:bg-card-hover'
                  }`}
                >
                  <BarChart3 size={14} />
                  Estático
                </button>
                <button
                  onClick={() => setOutputMode('animated')}
                  aria-pressed={outputMode === 'animated'}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    outputMode === 'animated'
                      ? 'bg-amber-500 text-black'
                      : 'bg-elevated text-secondary hover:bg-card-hover'
                  }`}
                >
                  <Film size={14} />
                  Animación
                </button>
              </div>
            </div>

            {outputMode === 'static' && (
              <ChartConfigPanel
                config={chartConfig}
                onChange={setChartConfig}
                columns={columns}
                aliasToTable={aliasToTable}
                fanOutTables={fanOutTables}
                fieldMeta={fieldMeta}
                data={filteredData}
              />
            )}
            {outputMode === 'animated' && (
              <>
                <TemplatePicker
                  data={filteredData}
                  config={chartConfig}
                  selectedTemplate={activeTemplate}
                  onSelect={(id) => {
                    templateDeselectRef.current = false;
                    setSelectedTemplate(id);
                  }}
                />

                {activeTemplate && (
                  <AnimationConfigPanel
                    templateId={activeTemplate}
                    columns={columns}
                    fieldMeta={fieldMeta}
                    value={templateConfig['timeline-race'] ?? {}}
                    onChange={(tc) => setTemplateConfig((prev) => ({...prev, 'timeline-race': tc as TimelineRaceConfig}))}
                  />
                )}

                {/* Duration slider */}
                {activeTemplate && templateEntry && (
                  <div className="space-y-1.5 border-t border-border-default pt-3">
                    <label htmlFor="duration-slider" className="text-sm font-medium mb-1 block font-body">
                      Duración (segundos)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id="duration-slider"
                        type="range"
                        min={1}
                        max={20}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="flex-1 accent-amber-500"
                      />
                      <span className="text-sm text-secondary w-20 text-right font-mono">
                        {duration}s ({duration * (templateEntry.meta.fps ?? 30)} frames)
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
        )}

        {/* Right export panel — step 3 (Exportar) */}
        {view === 'result' && resultStep === 3 && (
        <aside className="fixed inset-x-0 bottom-12 z-10 mx-2 mb-2 h-[58vh] rounded-xl border border-border-default flex flex-col overflow-hidden bg-card md:static md:inset-auto md:mx-0 md:mb-0 md:h-auto md:w-[22rem] md:shrink-0 md:rounded-none md:border-x-0 md:border-b-0 md:border-t lg:md:w-96">
          <div className="flex items-center justify-between px-4 h-10 border-b border-border-default shrink-0">
            <div className="flex items-center gap-2">
              <Download size={14} className="text-amber-500" />
              <span className="text-micro font-semibold text-secondary uppercase tracking-widest font-display">
                Exportar
              </span>
            </div>
            <button
              onClick={() => goResult(2)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted hover:text-secondary hover:bg-card-hover transition-colors"
              aria-label="Volver a configurar"
            >
              <ArrowLeft size={12} /> Configurar
            </button>
          </div>

          <ExportPanel
            outputMode={outputMode}
            staticExportRef={staticExportRef}
            filteredData={filteredData}
            chartConfig={chartConfig}
            vizName={vizName}
            templateId={outputMode === 'animated' ? activeTemplate : null}
            duration={duration}
            onDurationChange={setDuration}
            remotionProps={outputMode === 'animated' ? remotionProps : null}
          />
        </aside>
        )}
      </div>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border-default flex z-20">
        <button
          onClick={() => setView('data')}
          aria-pressed={view === 'data'}
          className={`flex-1 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            view === 'data' ? 'text-amber-500' : 'text-muted'
          }`}
        >
          <Database size={14} /> Datos
        </button>
        <button
          onClick={() => goResult(2)}
          aria-pressed={view === 'result'}
          className={`flex-1 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            view === 'result' ? 'text-amber-500' : 'text-muted'
          }`}
        >
          <BarChart3 size={14} /> Resultado
        </button>
      </div>
    </div>
  );
}
