'use client';

import {Suspense, useCallback, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {BarChart3, Film} from 'lucide-react';
import type {QuerySpec} from '@/lib/query-spec';
import {defaultQuerySpec} from '@/lib/query-spec';
import type {ChartConfig} from '@/lib/chart-config';
import {DEFAULT_CHART_CONFIG} from '@/lib/chart-config';
import type {SchemaMetadata} from '@/lib/schema-metadata';
import {getSchemaMetadata} from '@/lib/schema-metadata';
import {suggestBestTemplate} from '@/lib/viz-to-remotion';
import dynamic from 'next/dynamic';
import {ChartConfigPanel} from '@/components/builder/chart-config-panel';
import {ChartPreview} from '@/components/charts/chart-preview';
import {TemplatePicker} from '@/components/builder/template-picker';
import {AnimationPreview} from '@/components/builder/animation-preview';
import {BuilderNav} from '@/components/builder/builder-nav';
import {DataOptionsForm} from '@/components/builder/data-options-form';
import {TEMPLATES} from '@/remotion/generated/registry';
import type {TemplateId} from '@/remotion/generated/registry';
import {useToast} from '@/components/ui/toast';

const QueryCanvas = dynamic(
  () => import('@/components/canvas/query-canvas').then((m) => m.QueryCanvas),
  {ssr: false, loading: () => (
    <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
      Cargando canvas...
    </div>
  )},
);

type OutputMode = 'static' | 'animated';

export default function BuilderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
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
  const [sideTab, setSideTab] = useState<'data' | 'preview'>('data');
  const [outputMode, setOutputMode] = useState<OutputMode>(
    templateParam ? 'animated' : 'static',
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(templateParam);
  const [meta, setMeta] = useState<SchemaMetadata | null>(null);

  // Template-specific state
  const [templateOptions, setTemplateOptions] = useState<Record<string, unknown>>({});
  const [templateProps, setTemplateProps] = useState<Record<string, unknown> | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [duration, setDuration] = useState(10);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editIdRef = useRef<string | null>(editId);
  editIdRef.current = editId;
  const durationLoadedRef = useRef(false);

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

  // Load saved viz_spec when editing
  useEffect(() => {
    if (!editId) return;
    fetch(`/api/viz-specs/${editId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.query_spec) setSpec(d.query_spec);
        if (d.chart_config) setChartConfig(d.chart_config);
        if (d.name) setVizName(d.name);
        if (d.animation_config) {
          const ac = d.animation_config;
          if (ac.templateId) {
            setSelectedTemplate(ac.templateId);
            setOutputMode('animated');
          }
          if (ac.templateOptions) setTemplateOptions(ac.templateOptions);
          if (ac.duration) {
            setDuration(ac.duration);
            durationLoadedRef.current = true;
          }
        }
        setSaved(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error loading viz_spec'));
  }, [editId]);

  // Initialize duration from template default when template changes
  useEffect(() => {
    if (activeTemplate && !durationLoadedRef.current) {
      const entry = TEMPLATES[activeTemplate as TemplateId];
      if (entry) setDuration(entry.meta.defaultDuration);
    }
    durationLoadedRef.current = false;
  }, [activeTemplate]);

  // Clear template props when template changes
  useEffect(() => {
    setTemplateProps(null);
    setTemplateOptions({});
    setTemplateError(null);
  }, [selectedTemplate]);

  const executeQuery = useCallback(async (q: QuerySpec) => {
    if (!q.table) return;
    setLoading(true);
    setError(null);
    setResultTruncated(false);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({spec: q}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error executing query');
      const rows = json.data ?? [];
      // U12: Warn if result exceeds 1000 rows
      if (rows.length >= 1000) {
        setResultTruncated(true);
        setData(rows.slice(0, 1000));
      } else {
        setData(rows);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

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
  useEffect(() => {
    if (outputMode === 'animated' && templateParam && !selectedTemplate) {
      setSelectedTemplate(templateParam);
    }
  }, [outputMode, templateParam, selectedTemplate]);

  const loadTemplateData = useCallback(async () => {
    if (!activeTemplate) return;
    setTemplateLoading(true);
    setTemplateError(null);
    try {
      const res = await fetch(`/api/templates/${activeTemplate}/data`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({options: templateOptions}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setTemplateProps(json.props);
      addToast('Datos de plantilla cargados', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setTemplateError(msg);
      addToast(`Error cargando datos: ${msg}`, 'error');
    } finally {
      setTemplateLoading(false);
    }
  }, [activeTemplate, templateOptions, addToast]);

  const handleSave = async () => {
    // Validate: require at least one column selected
    if (!spec.select || spec.select.length === 0) {
      addToast('Selecciona al menos una columna en el canvas antes de guardar', 'error');
      return;
    }
    setSaving(true);
    try {
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
            ? {templateId: activeTemplate, templateOptions, duration}
            : null,
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

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <BuilderNav />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={vizName}
            onChange={(e) => setVizName(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm w-64"
            aria-label="Nombre de la visualización"
          />
          {pendingQuery && (
            <button
              onClick={handleRunQuery}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-sm transition-colors"
              aria-label="Ejecutar consulta"
            >
              ▶ Ejecutar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !spec.table}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 rounded text-sm transition-colors"
            aria-label={saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar visualización'}
          >
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar'}
          </button>
          <Link
            href="/builder/gallery"
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition-colors"
            aria-label="Ir a la galería de visualizaciones"
          >
            Galería
          </Link>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-80 border-r border-zinc-800 flex flex-col overflow-hidden">
          <div className="flex border-b border-zinc-800">
            {(['data', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSideTab(tab)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  sideTab === tab
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'data' ? 'Datos' : 'Preview'}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sideTab === 'data' && meta && (
              <QueryCanvas
                spec={spec}
                onChange={handleSpecChange}
                meta={meta.tables}
              />
            )}
            {sideTab === 'data' && !meta && (
              <div className="space-y-3 animate-pulse">
                <div className="h-8 bg-zinc-800 rounded" />
                <div className="h-8 bg-zinc-800 rounded" />
                <div className="h-20 bg-zinc-800 rounded" />
              </div>
            )}
            {sideTab === 'preview' && (
              <div className="space-y-4">
                {/* Output mode toggle */}
                <div>
                  <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2 block">
                    Modo de salida
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => setOutputMode('static')}
                      className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                        outputMode === 'static'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      <BarChart3 size={14} className="inline mr-1" />
                      Estático
                    </button>
                    <button
                      onClick={() => setOutputMode('animated')}
                      className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                        outputMode === 'animated'
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      <Film size={14} className="inline mr-1" />
                      Animación
                    </button>
                  </div>
                </div>

                {outputMode === 'static' && (
                  <ChartConfigPanel
                    config={chartConfig}
                    onChange={setChartConfig}
                    columns={columns}
                  />
                )}
                {outputMode === 'animated' && (
                  <>
                    <TemplatePicker
                      data={data}
                      config={chartConfig}
                      selectedTemplate={activeTemplate}
                      onSelect={setSelectedTemplate}
                    />

                    {/* Template data options + duration */}
                    {activeTemplate && templateEntry && (
                      <div className="space-y-3 border-t border-zinc-700 pt-3">
                        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                          Datos de plantilla
                        </label>

                        {templateEntry.meta.dataOptions.length > 0 && (
                          <DataOptionsForm
                            options={templateEntry.meta.dataOptions}
                            values={templateOptions}
                            onChange={(key, val) => setTemplateOptions((prev) => ({...prev, [key]: val}))}
                          />
                        )}

                        {/* Duration slider */}
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            Duración (segundos)
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={1}
                              max={20}
                              value={duration}
                              onChange={(e) => setDuration(Number(e.target.value))}
                              className="flex-1 accent-blue-500"
                            />
                            <span className="text-sm text-zinc-300 w-20 text-right">
                              {duration}s ({duration * (templateEntry.meta.fps ?? 30)} frames)
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={loadTemplateData}
                          disabled={templateLoading}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 text-white font-medium py-2 rounded-lg transition-colors text-sm"
                        >
                          {templateLoading ? 'Cargando...' : 'Cargar datos de plantilla'}
                        </button>

                        {templateError && (
                          <div className="p-2 bg-red-900/20 border border-red-800 rounded text-red-400 text-xs">
                            {templateError}
                          </div>
                        )}

                        {templateProps && (
                          <div className="p-2 bg-green-900/20 border border-green-800 rounded text-green-400 text-xs">
                            Datos cargados correctamente
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main canvas — preview */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500">
            <span>
              {spec.table ? `${spec.table} → ${data.length} filas` : 'Selecciona una tabla para comenzar'}
            </span>
            {resultTruncated && (
              <span className="text-amber-400">
                ⚠ Resultados truncados a 1000 filas
              </span>
            )}
            {loading && <span className="text-blue-400">Consultando...</span>}
            {error && <span className="text-red-400">{error}</span>}
          </div>

          {/* Preview area */}
          {outputMode === 'static' ? (
            <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
              <div className="w-full max-w-3xl">
                {chartConfig.title && (
                  <h2 className="text-center text-lg font-semibold mb-4">{chartConfig.title}</h2>
                )}
                <ChartPreview data={data} config={chartConfig} />
              </div>
            </div>
          ) : activeTemplate ? (
            <AnimationPreview
              templateId={activeTemplate}
              data={data}
              config={chartConfig}
              spec={spec}
              templateProps={templateProps}
              duration={duration}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
              Selecciona un template para previsualizar
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
