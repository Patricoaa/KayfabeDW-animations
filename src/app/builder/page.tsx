'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {QuerySpec} from '@/lib/query-spec';
import {defaultQuerySpec} from '@/lib/query-spec';
import type {ChartConfig} from '@/lib/chart-config';
import {DEFAULT_CHART_CONFIG} from '@/lib/chart-config';
import {DataPanel} from '@/components/builder/data-panel';
import {FilterBar} from '@/components/builder/filter-bar';
import {ChartConfigPanel} from '@/components/builder/chart-config-panel';
import {ChartPreview} from '@/components/charts/chart-preview';
import {AnimationPanel} from '@/components/builder/animation-panel';

type VizSpec = {
  id?: string;
  name: string;
  query_spec: QuerySpec;
  chart_config: ChartConfig;
};

export default function BuilderPage() {
  const router = useRouter();
  const [spec, setSpec] = useState<QuerySpec>(defaultQuerySpec(''));
  const [chartConfig, setChartConfig] = useState<ChartConfig>(DEFAULT_CHART_CONFIG);
  const [vizName, setVizName] = useState('Nueva visualización');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sideTab, setSideTab] = useState<'data' | 'chart' | 'filters' | 'animation'>('data');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const res = await fetch('/api/viz-specs', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: vizName,
          query_spec: spec,
          chart_config: chartConfig,
        }),
      });
      if (!res.ok) throw new Error('Error saving');
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
          <Link href="/" className="text-zinc-500 hover:text-white transition-colors text-sm">
            ← Animations
          </Link>
          <h1 className="text-lg font-semibold">Visual Builder</h1>
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
        {/* Left sidebar — config */}
        <aside className="w-80 border-r border-zinc-800 flex flex-col overflow-hidden">
          <div className="flex border-b border-zinc-800">
            {(['data', 'chart', 'filters', 'animation'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSideTab(tab)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  sideTab === tab
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'data' ? 'Datos' : tab === 'chart' ? 'Gráfico' : tab === 'filters' ? 'Filtros' : 'Animación'}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sideTab === 'data' && (
              <DataPanel spec={spec} onChange={handleSpecChange} />
            )}
            {sideTab === 'chart' && (
              <ChartConfigPanel
                config={chartConfig}
                onChange={setChartConfig}
                columns={columns}
              />
            )}
            {sideTab === 'filters' && (
              <FilterBar
                specTable={spec.table}
                filters={spec.filters ?? []}
                onChange={(filters) => handleSpecChange({...spec, filters})}
              />
            )}
            {sideTab === 'animation' && (
              <AnimationPanel
                data={data}
                config={chartConfig}
                spec={spec}
              />
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

          {/* Chart preview */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            <div className="w-full max-w-3xl">
              {chartConfig.title && (
                <h2 className="text-center text-lg font-semibold mb-4">{chartConfig.title}</h2>
              )}
              <ChartPreview data={data} config={chartConfig} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
