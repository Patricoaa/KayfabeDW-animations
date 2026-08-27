'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useToast} from '@/components/ui/toast';
import {BarChart3, TrendingUp, TrendingDown, PieChart, Zap, Table, Search, ArrowUpDown, Copy, Trash2, Folder, ArrowLeft, Plus, X} from 'lucide-react';

const CHART_ICONS: Record<string, React.ComponentType<{size?: number; className?: string}>> = {
  bar: BarChart3,
  line: TrendingUp,
  area: TrendingDown,
  pie: PieChart,
  scatter: Zap,
  table: Table,
};

const CHART_COLORS: Record<string, string> = {
  bar: '#f59e0b',
  line: '#3b82f6',
  area: '#22c55e',
  pie: '#a855f7',
  scatter: '#f97316',
  table: '#94a3b8',
};

type VizSpec = {
  id: string;
  name: string;
  query_spec: {table?: string; select?: {column: string}[]; joins?: {table: string}[]};
  chart_config: {type?: string; title?: string};
  animation_config?: {templateId?: string; templateOptions?: Record<string, unknown>; duration?: number} | null;
  thumbnail_url?: string | null;
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
        className="bg-card border border-border-default rounded-lg overflow-hidden hover:border-amber-500/50 transition-colors"
      >
        {/* U4: Color-coded header bar */}
        <div className="h-1.5" style={{backgroundColor: accentColor}} />

        {spec.thumbnail_url && (
          <img
            src={spec.thumbnail_url}
            alt={`Vista previa de ${spec.name}`}
            loading="lazy"
            className="w-full h-40 object-cover bg-elevated"
          />
        )}

        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon size={20} className="text-amber-500 shrink-0" />
              <h3 className="font-display font-semibold truncate">{spec.name}</h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {spec.is_draft && (
                <span className="text-[9px] text-amber-500 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/40 rounded">
                  borrador
                </span>
              )}
              {typeof spec.version === 'number' && spec.version > 1 && (
                <span title={`Versión ${spec.version}`} className="text-[9px] text-secondary px-1.5 py-0.5 bg-elevated border border-border-subtle rounded">
                  v{spec.version}
                </span>
              )}
              <span className="text-[10px] text-muted px-1.5 py-0.5 bg-elevated border border-border-subtle rounded">
                {chartType}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-secondary font-mono mb-1">
            {getSummary(spec)}
          </p>
          <p className="text-[10px] text-muted">
            {new Date(spec.created_at).toLocaleDateString('es', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href={`/builder?edit=${spec.id}`}
              className="flex-1 text-center px-3 py-1.5 bg-amber-500 hover:bg-amber-400 rounded text-xs font-semibold text-black transition-colors font-display"
            >
              Editar
            </Link>
            <button
              onClick={() => handleDuplicate(spec)}
              disabled={duplicating === spec.id}
              title="Duplicar visualización"
              className="px-3 py-1.5 text-muted hover:text-amber-500 hover:bg-card-hover rounded text-xs transition-colors"
            >
              {duplicating === spec.id ? '...' : <Copy size={14} />}
            </button>
            <button
              onClick={() => handleDelete(spec.id)}
              disabled={deleting === spec.id}
              className="px-3 py-1.5 text-muted hover:text-red-500 hover:bg-card-hover rounded text-xs transition-colors"
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
          <Link href="/builder" className="flex items-center gap-1 text-muted hover:text-primary transition-colors text-sm">
            <ArrowLeft size={14} /> Builder
          </Link>
          <h1 className="text-2xl font-display font-bold">Galería de Visualizaciones</h1>
          <span className="text-xs text-muted">{specs.length} total</span>
        </div>
        <Link
          href="/builder"
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 rounded text-sm font-semibold text-black transition-colors font-display"
        >
          <Plus size={16} /> Nueva
        </Link>
      </div>

      {/* U3: Search + Sort + Filter bar */}
      {specs.length > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o tabla..."
            className="flex-1 max-w-xs bg-elevated border border-border-default rounded-lg px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          />

          {/* Chart type filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                typeFilter === 'all'
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'text-muted hover:text-primary'
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
                    ? 'bg-amber-500 text-black'
                    : 'text-muted hover:text-primary'
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
            className="bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                ? 'bg-amber-500 text-black font-semibold'
                : 'bg-card-hover text-secondary hover:bg-border-subtle'
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
            <div key={i} className="h-48 bg-elevated rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredSpecs.length === 0 ? (
        <div className="text-center py-20 text-muted">
          {specs.length === 0 ? (
            <>
              <p className="text-lg mb-2 font-display text-primary">No hay visualizaciones guardadas</p>
              <p className="text-sm mb-4">Crea tu primera visualización en el Builder</p>
              <Link
                href="/builder"
                className="inline-block px-4 py-2 bg-amber-500 hover:bg-amber-400 rounded text-sm font-semibold text-black transition-colors font-display"
              >
                Ir al Builder
              </Link>
            </>
          ) : (
            <>
              <p className="text-lg mb-2 font-display text-primary">Sin resultados</p>
              <p className="text-sm">Prueba con otros filtros de búsqueda</p>
            </>
          )}
        </div>
      ) : grouped ? (
        <div className="space-y-8">
          {grouped.map(([table, items]) => (
            <div key={table}>
              <div className="flex items-center gap-2 mb-3">
                <Folder size={14} className="text-amber-500" />
                <h2 className="text-sm font-semibold text-primary font-display">{table}</h2>
                <span className="text-[10px] text-muted">{items.length}</span>
                <div className="flex-1 h-px bg-border-subtle" />
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
        <div className="fixed bottom-4 right-4 p-3 bg-red-500/15 border border-red-500/40 rounded-lg text-red-500 text-sm max-w-sm flex items-center gap-2">
          <span className="flex-1">{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="text-red-500 hover:text-red-400 rounded p-0.5" aria-label="Cerrar error">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
