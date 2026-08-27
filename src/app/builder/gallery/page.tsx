'use client';

import {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';

const CHART_ICONS: Record<string, string> = {
  bar: '📊',
  line: '📈',
  area: '📉',
  pie: '🥧',
  scatter: '⚡',
  table: '📋',
};

type VizSpec = {
  id: string;
  name: string;
  query_spec: {table?: string; select?: {column: string}[]; joins?: {table: string}[]};
  chart_config: {type?: string; title?: string};
  created_at: string;
  updated_at: string;
};

export default function GalleryPage() {
  const [specs, setSpecs] = useState<VizSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/viz-specs')
      .then((r) => r.json())
      .then((data) => setSpecs(Array.isArray(data) ? data : []))
      .catch(() => setSpecs([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar esta visualización?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/viz-specs/${id}`, {method: 'DELETE'});
      setSpecs((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }, []);

  const getSummary = (spec: VizSpec) => {
    const table = spec.query_spec?.table ?? '?';
    const colCount = spec.query_spec?.select?.length ?? 0;
    const joinCount = spec.query_spec?.joins?.length ?? 0;
    const parts = [table];
    if (colCount > 0) parts.push(`${colCount} cols`);
    if (joinCount > 0) parts.push(`${joinCount} JOINs`);
    return parts.join(' · ');
  };

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/builder" className="text-zinc-500 hover:text-white transition-colors text-sm">
            ← Builder
          </Link>
          <h1 className="text-2xl font-bold">Galería de Visualizaciones</h1>
        </div>
        <Link
          href="/builder"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
        >
          + Nueva
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-zinc-900 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : specs.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg mb-2">No hay visualizaciones guardadas</p>
          <p className="text-sm">Crea tu primera visualización en el Builder</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {specs.map((spec) => {
            const chartType = spec.chart_config?.type ?? 'bar';
            const icon = CHART_ICONS[chartType] ?? '📊';
            return (
              <div
                key={spec.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    <h3 className="font-medium truncate">{spec.name}</h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 bg-zinc-800 rounded">
                    {chartType}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono mb-1">
                  {getSummary(spec)}
                </p>
                <p className="text-[10px] text-zinc-600">
                  {new Date(spec.created_at).toLocaleDateString('es', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/builder?edit=${spec.id}`}
                    className="flex-1 text-center px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs transition-colors"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(spec.id)}
                    disabled={deleting === spec.id}
                    className="px-3 py-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded text-xs transition-colors"
                  >
                    {deleting === spec.id ? '...' : '✕'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
