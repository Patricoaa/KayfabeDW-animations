'use client';

import {Suspense, useCallback, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
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
  const [spec, setSpec] = useState<QuerySpec>(defaultQuerySpec(''));
  const [chartConfig, setChartConfig] = useState<ChartConfig>(DEFAULT_CHART_CONFIG);
  const [vizName, setVizName] = useState('Nueva visualización');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sideTab, setSideTab] = useState<'data' | 'preview'>('data');
  const [outputMode, setOutputMode] = useState<OutputMode>('static');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [meta, setMeta] = useState<SchemaMetadata | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editIdRef = useRef<string | null>(editId);
  editIdRef.current = editId;

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
      .then((data) => {
        if (data.query_spec) setSpec(data.query_spec);
        if (data.chart_config) setChartConfig(data.chart_config);
        if (data.name) setVizName(data.name);
        setSaved(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error loading viz_spec'));
  }, [editId]);

  const executeQuery = useCallback(async (q: QuerySpec) => {
    if (!q.table) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({spec: q}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error executing query');
      setData(json.data ?? []);
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
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => executeQuery(newSpec), 400);
    },
    [executeQuery],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSave = async () => {
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
        }),
      });
      if (!res.ok) throw new Error('Error saving');
      setSaved(true);
      // If newly created, update the URL to edit mode
      if (!isEdit) {
        const created = await res.json();
        if (created?.id) {
          editIdRef.current = created.id;
          window.history.replaceState(null, '', `/builder?edit=${created.id}`);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  // Auto-select best template when switching to animation mode
  const bestTemplate = outputMode === 'animated' && data.length > 0
    ? suggestBestTemplate(chartConfig, data)
    : null;

  const activeTemplate = selectedTemplate ?? bestTemplate;

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
          />
          <button
            onClick={handleSave}
            disabled={saving || !spec.table}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 rounded text-sm transition-colors"
          >
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar'}
          </button>
          <Link
            href="/builder/gallery"
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition-colors"
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
                      📊 Estático
                    </button>
                    <button
                      onClick={() => setOutputMode('animated')}
                      className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                        outputMode === 'animated'
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      🎬 Animación
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
                  <TemplatePicker
                    data={data}
                    config={chartConfig}
                    selectedTemplate={activeTemplate}
                    onSelect={setSelectedTemplate}
                  />
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
