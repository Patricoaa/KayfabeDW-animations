'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useToast} from '@/components/ui/toast';
import {BarChart3, TrendingUp, TrendingDown, PieChart, Zap, Table, Search, ArrowUpDown, Copy, Trash2, Folder} from 'lucide-react';

const CHART_ICONS: Record<string, React.ComponentType<{size?: number; className?: string}>> = {
  bar: BarChart3,
  line: TrendingUp,
  area: TrendingDown,
  pie: PieChart,
  scatter: Zap,
  table: Table,
};

const CHART_COLORS: Record<string, string> = {
  bar: '#6366f1',
  line: '#3b82f6',
  area: '#22c55e',
  pie: '#a855f7',
  scatter: '#f97316',
  table: '#64748b',
};

type VizSpec = {
  id: string;
  name: string;
  query_spec: {table?: string; select?: {column: string}[]; joins?: {table: string}[]};
  chart_config: {type?: string; title?: string};
  animation_config?: {templateId?: string; templateOptions?: Record<string, unknown>; duration?: number} | null;
  is_draft?: boolean;
  version?: number;
  created_at: string;
  updated_at: string;
};

type SortKey = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

export default function GalleryPage() {
  const router = useRouter();
  const {addToast} = useToast();
  const [specs, setSpecs] = useState<VizSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  // U3: Sort & filter state
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Q4.B: Group cards by their source table ("folder" = data source)
  const [groupByTable, setGroupByTable] = useState(false);

  useEffect(() => {
    fetch('/api/viz-specs')
      .then((r) => r.json())
      .then((data) => setSpecs(Array.isArray(data) ? data : []))
      .catch(() => setSpecs([]))
      .finally(() => setLoading(false));
  }, []);

  // U3: Derived filtered + sorted list
  const filteredSpecs = useMemo(() => {
    let result = specs;

    // Filter by search term
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.query_spec?.table?.toLowerCase().includes(q),
      );
    }

    // Filter by chart type
    if (typeFilter !== 'all') {
      result = result.filter((s) => (s.chart_config?.type ?? 'bar') === typeFilter);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        result = [...result].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'name-asc':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result = [...result].sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return result;
  }, [specs, search, sortBy, typeFilter]);

  // Get unique chart types for filter
  const chartTypes = useMemo(() => {
    const types = new Set(specs.map((s) => s.chart_config?.type ?? 'bar'));
    return Array.from(types);
  }, [specs]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar esta visualización?')) return;
    setDeleting(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/viz-specs/${id}`, {method: 'DELETE'});
      if (!res.ok) throw new Error('Error al eliminar');
      setSpecs((prev) => prev.filter((s) => s.id !== id));
      addToast('Visualización eliminada', 'success');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  }, []);

  // U5: Duplicate
  const handleDuplicate = useCallback(async (spec: VizSpec) => {
    setDuplicating(spec.id);
    try {
      const res = await fetch('/api/viz-specs', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: `${spec.name} (copia)`,
          query_spec: spec.query_spec,
          chart_config: spec.chart_config,
          animation_config: spec.animation_config ?? null,
        }),
      });
      if (!res.ok) throw new Error('Error al duplicar');
      const created = await res.json();
      addToast('Visualización duplicada', 'success');
      if (created?.id) {
        router.push(`/builder?edit=${created.id}`);
      }
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Error al duplicar');
    } finally {
      setDuplicating(null);
    }
  }, [router]);

  const getSummary = (spec: VizSpec) => {
    const table = spec.query_spec?.table ?? '?';
    const colCount = spec.query_spec?.select?.length ?? 0;
    const joinCount = spec.query_spec?.joins?.length ?? 0;
    const parts = [table];
    if (colCount > 0) parts.push(`${colCount} cols`);
    if (joinCount > 0) parts.push(`${joinCount} JOINs`);
    return parts.join(' · ');
  };

  const renderCard = (spec: VizSpec) => {
    const chartType = spec.chart_config?.type ?? 'bar';
    const Icon = CHART_ICONS[chartType] ?? BarChart3;
    const accentColor = CHART_COLORS[chartType] ?? '#6366f1';
    return (
      <div
        key={spec.id}
        className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors"
      >
        {/* U4: Color-coded header bar */}
        <div className="h-1.5" style={{backgroundColor: accentColor}} />

        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon size={20} />
              <h3 className="font-medium truncate">{spec.name}</h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {spec.is_draft && (
                <span className="text-[9px] text-amber-300 px-1.5 py-0.5 bg-amber-900/30 border border-amber-700/40 rounded">
                  borrador
                </span>
              )}
              {typeof spec.version === 'number' && spec.version > 1 && (
                <span title={`Versión ${spec.version}`} className="text-[9px] text-zinc-400 px-1.5 py-0.5 bg-zinc-800 rounded">
                  v{spec.version}
                </span>
              )}
              <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 bg-zinc-800 rounded">
                {chartType}
              </span>
            </div>
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
              onClick={() => handleDuplicate(spec)}
              disabled={duplicating === spec.id}
              title="Duplicar visualización"
              className="px-3 py-1.5 text-zinc-600 hover:text-blue-400 hover:bg-zinc-800 rounded text-xs transition-colors"
            >
              {duplicating === spec.id ? '...' : <Copy size={14} />}
            </button>
            <button
              onClick={() => handleDelete(spec.id)}
              disabled={deleting === spec.id}
              className="px-3 py-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded text-xs transition-colors"
            >
              {deleting === spec.id ? '...' : <Trash2 size={14} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Q4.B: Group specs by their source table when grouping is enabled.
  const grouped = useMemo(() => {
    if (!groupByTable) return null;
    const map = new Map<string, VizSpec[]>();
    for (const spec of filteredSpecs) {
      const table = spec.query_spec?.table ?? 'sin tabla';
      if (!map.has(table)) map.set(table, []);
      map.get(table)!.push(spec);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [groupByTable, filteredSpecs]);

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/builder" className="text-zinc-500 hover:text-white transition-colors text-sm">
            ← Builder
          </Link>
          <h1 className="text-2xl font-bold">Galería de Visualizaciones</h1>
          <span className="text-xs text-zinc-500">{specs.length} total</span>
        </div>
        <Link
          href="/builder"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
        >
          + Nueva
        </Link>
      </div>

      {/* U3: Search + Sort + Filter bar */}
      {specs.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o tabla..."
            className="flex-1 max-w-xs bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm"
          />

          {/* Chart type filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                typeFilter === 'all'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Todos
            </button>
            {chartTypes.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                title={t}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  typeFilter === t
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {(() => { const Icon = CHART_ICONS[t]; return Icon ? <Icon size={14} /> : <BarChart3 size={14} />; })()}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs"
          >
            <option value="newest">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="name-asc">Nombre A→Z</option>
            <option value="name-desc">Nombre Z→A</option>
          </select>

          {/* Q4.B: Group by source table */}
          <button
            onClick={() => setGroupByTable((v) => !v)}
            className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors ${
              groupByTable
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            aria-pressed={groupByTable}
          >
            <Folder size={14} /> Agrupar por tabla
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-zinc-900 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredSpecs.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          {specs.length === 0 ? (
            <>
              <p className="text-lg mb-2">No hay visualizaciones guardadas</p>
              <p className="text-sm mb-4">Crea tu primera visualización en el Builder</p>
              <Link
                href="/builder"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white transition-colors"
              >
                Ir al Builder
              </Link>
            </>
          ) : (
            <>
              <p className="text-lg mb-2">Sin resultados</p>
              <p className="text-sm">Prueba con otros filtros de búsqueda</p>
            </>
          )}
        </div>
      ) : grouped ? (
        <div className="space-y-8">
          {grouped.map(([table, items]) => (
            <div key={table}>
              <div className="flex items-center gap-2 mb-3">
                <Folder size={14} className="text-zinc-500" />
                <h2 className="text-sm font-semibold text-zinc-300">{table}</h2>
                <span className="text-[10px] text-zinc-500">{items.length}</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(renderCard)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpecs.map(renderCard)}
        </div>
      )}

      {deleteError && (
        <div className="fixed bottom-4 right-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm max-w-sm">
          {deleteError}
          <button onClick={() => setDeleteError(null)} className="ml-2 text-red-300 hover:text-white">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
