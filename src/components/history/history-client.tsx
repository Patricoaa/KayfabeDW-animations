'use client';

import {useCallback, useMemo, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useToast} from '@/components/ui/toast';
import {ConfirmDialog} from '@/components/ui/confirm-dialog';
import {BarChart3, Search, ArrowUpDown, Copy, Trash2, Folder, Film, CheckCircle2, XCircle, Clock, Plus, ArrowRight} from 'lucide-react';

// Display names mirror TEMPLATES in src/remotion/generated/registry.ts. Kept
// as a static map so the client bundle doesn't pull in the registry's
// queryData modules (@supabase/supabase-js) just to label a render row.
const TEMPLATE_NAMES: Record<string, string> = {
  'race-scrolling': 'Race Scrolling',
  'ranking': 'Ranking',
  'timeline-race': 'Timeline Race',
};

const CHART_ICONS: Record<string, React.ComponentType<{size?: number; className?: string}>> = {
  bar: BarChart3,
  line: BarChart3,
  area: BarChart3,
  pie: BarChart3,
  scatter: BarChart3,
  table: BarChart3,
};

const CHART_COLORS: Record<string, string> = {
  bar: '#f59e0b',
  line: '#3b82f6',
  area: '#8b5cf6',
  pie: '#10b981',
  scatter: '#f97316',
  table: '#6366f1',
};

// Proper display names per chart type (scalable: any new type extends the
// map instead of hardcoding labels per card).
const CHART_TYPE_LABELS: Record<string, string> = {
  bar: 'Barras',
  line: 'Líneas',
  area: 'Área',
  pie: 'Torta',
  scatter: 'Dispersión',
  table: 'Tabla',
};

const STATUS_LABEL: Record<string, string> = {
  done: 'Listo',
  processing: 'Procesando',
  pending: 'Pendiente',
  error: 'Error',
};

export type RenderRecord = {
  id: string;
  template_id: string | null;
  status: string | null;
  output_url?: string | null;
  output_size?: number | null;
  created_at: string;
  completed_at?: string | null;
};

export type VizSpec = {
  id: string;
  name: string;
  chart_type?: string | null;
  source_table?: string | null;
  select_count?: number | null;
  join_count?: number | null;
  thumbnail_url?: string | null;
  is_draft?: boolean;
  version?: number;
  created_at: string;
  updated_at: string;
};

type SortKey = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Config-driven preview shown when a saved view has no uploaded thumbnail.
 * A deterministic SVG skeleton derived from chart_type / source_table / column
 * count — instant, no blob, always available. The real thumbnail takes
 * precedence whenever one exists.
 */
function SpecPreview({spec}: {spec: VizSpec}) {
  const chartType = spec.chart_type ?? 'bar';
  const accent = CHART_COLORS[chartType] ?? '#f59e0b';
  const table = spec.source_table ?? 'tabla';
  const cols = spec.select_count ?? 0;

  let chart: React.ReactNode;
  if (chartType === 'pie') {
    chart = (
      <>
        <circle cx="160" cy="82" r="52" fill="none" stroke={accent} strokeWidth="34" opacity="0.3" />
        <circle cx="160" cy="82" r="52" fill="none" stroke={accent} strokeWidth="34" strokeDasharray="163 327" strokeLinecap="round" />
        <circle cx="160" cy="82" r="52" fill="none" stroke={accent} strokeWidth="34" strokeDasharray="81 409" strokeDashoffset="-185" opacity="0.6" />
        <circle cx="160" cy="82" r="16" fill="var(--bg-elevated)" />
      </>
    );
  } else if (chartType === 'table') {
    chart = (
      <g>
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={24 + (i % 4) * 74}
            y={24 + Math.floor(i / 4) * 58}
            width={54}
            height={38}
            rx={3}
            fill={accent}
            opacity={0.3 + ((i * 37) % 55) / 100}
          />
        ))}
      </g>
    );
  } else if (chartType === 'line' || chartType === 'area') {
    const pts = '26,112 86,64 146,96 206,48 266,80 294,58';
    chart = (
      <g>
        {chartType === 'area' && (
          <path d={`M26,132 L${pts.replace(/ /g, ' L')} L294,132 Z`} fill={accent} opacity="0.16" />
        )}
        <polyline points={pts} fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  } else {
    chart = (
      <g>
        {[0.9, 0.5, 0.72, 0.8, 0.4, 0.58, 0.86, 0.66].map((h, i) => (
          <rect
            key={i}
            x={22 + i * 37}
            y={134 - h * 104}
            width={24}
            height={h * 104}
            rx={3}
            fill={accent}
            opacity={i === 3 ? 1 : 0.55}
          />
        ))}
      </g>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Vista previa de ${spec.name}`}
      className="relative h-full w-full overflow-hidden rounded-md bg-elevated"
    >
      <svg
        viewBox="0 0 320 160"
        preserveAspectRatio={chartType === 'pie' ? 'xMidYMid meet' : 'none'}
        className="h-full w-full"
        aria-hidden
      >
        {chart}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pt-6 pb-1.5">
        <span className="block truncate text-[9px] font-mono text-slate-200">
          {table}
          {cols > 0 ? ` · ${cols} cols` : ''}
        </span>
      </div>
    </div>
  );
}

/**
 * Real thumbnail with graceful degradation: if the blob URL fails or 404s,
 * it falls back to the config-driven SpecPreview instead of showing a broken
 * image.
 */
function Thumb({spec}: {spec: VizSpec}) {
  const [failed, setFailed] = useState(false);

  if (spec.thumbnail_url && !failed) {
    return (
      <img
        src={spec.thumbnail_url}
        alt={`Vista previa de ${spec.name}`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    );
  }
  return <SpecPreview spec={spec} />;
}

export function HistoryClient({
  renders,
  specs,
}: {
  renders: RenderRecord[];
  specs: VizSpec[];
}) {
  const router = useRouter();
  const {addToast} = useToast();
  const [specItems, setSpecItems] = useState<VizSpec[]>(specs);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sort & filter state (absorbed from gallery)
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [groupByTable, setGroupByTable] = useState(false);

  // Derived filtered + sorted specs list
  const filteredSpecs = useMemo(() => {
    let result = specItems;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.source_table?.toLowerCase().includes(q),
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((s) => (s.chart_type ?? 'bar') === typeFilter);
    }

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
  }, [specItems, search, sortBy, typeFilter]);

  // Unique chart types for filter
  const chartTypes = useMemo(() => {
    const types = new Set(specItems.map((s) => s.chart_type ?? 'bar'));
    return Array.from(types);
  }, [specItems]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/viz-specs/${id}`, {method: 'DELETE'});
      if (!res.ok) throw new Error('Error al eliminar');
      setSpecItems((prev) => prev.filter((s) => s.id !== id));
      addToast('Visualización eliminada', 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Error al eliminar', 'error');
    } finally {
      setDeleting(null);
    }
  }, [addToast]);

  const handleDuplicate = useCallback(async (spec: VizSpec) => {
    setDuplicating(spec.id);
    try {
      // The summary row is lean by design; pull the full spec only to copy it.
      const fullRes = await fetch(`/api/viz-specs/${spec.id}`);
      if (!fullRes.ok) throw new Error('Error al cargar la visualización');
      const full = await fullRes.json();
      const res = await fetch('/api/viz-specs', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: `${spec.name} (copia)`,
          query_spec: full.query_spec,
          chart_config: full.chart_config,
          animation_config: full.animation_config ?? null,
        }),
      });
      if (!res.ok) throw new Error('Error al duplicar');
      const created = await res.json();
      addToast('Visualización duplicada', 'success');
      if (created?.id) {
        router.push(`/builder?edit=${created.id}`);
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Error al duplicar', 'error');
    } finally {
      setDuplicating(null);
    }
  }, [router, addToast]);

  const getSummary = (spec: VizSpec) => {
    const table = spec.source_table ?? '?';
    const colCount = spec.select_count ?? 0;
    const joinCount = spec.join_count ?? 0;
    const parts = [table];
    if (colCount > 0) parts.push(`${colCount} cols`);
    if (joinCount > 0) parts.push(`${joinCount} JOINs`);
    return parts.join(' · ');
  };

  const renderCard = (spec: VizSpec) => {
    const chartType = spec.chart_type ?? 'bar';
    const accentColor = CHART_COLORS[chartType] ?? '#f59e0b';
    return (
      <div
        key={spec.id}
        className="group relative bg-card border border-border-default rounded-lg overflow-hidden hover:border-amber-500/50 transition-colors"
      >
        {/* Whole card → edits the view (stretched link sits ABOVE the content;
            secondary action buttons raise above it). */}
        <Link
          href={`/builder?edit=${spec.id}`}
          aria-label={`Editar ${spec.name}`}
          className="absolute inset-0 z-10 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        />

        {/* Kicker + dateline */}
        <div className="relative px-4 pt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{backgroundColor: accentColor}}
              />
              <span className="text-micro font-display font-bold uppercase tracking-widest text-secondary truncate">
                {CHART_TYPE_LABELS[chartType] ?? chartType}
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted shrink-0">
              {new Date(spec.created_at).toLocaleDateString('es', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <h3 className="font-display font-semibold leading-snug mt-2 line-clamp-2 group-hover:text-amber-500/90 transition-colors">
            {spec.name}
          </h3>
        </div>

        {/* Framed preview plate */}
        <div className="px-4 mt-3">
          <div className="relative rounded-lg bg-card-hover p-1">
            <div className="relative h-36 sm:h-44 w-full overflow-hidden rounded-md">
              <Thumb spec={spec} />
            </div>
          </div>
        </div>

        {/* Footer: summary + primary affordance + secondary actions */}
        <div className="flex items-center justify-between gap-2 border-t border-border-subtle px-4 py-2.5 mt-3">
          <p className="text-[10px] font-mono text-muted truncate">{getSummary(spec)}</p>
          <div className="flex items-center gap-1 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold font-display text-amber-600 dark:text-amber-500/80 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
              Editar <ArrowRight size={12} aria-hidden />
            </span>
            <button
              onClick={() => handleDuplicate(spec)}
              disabled={duplicating === spec.id}
              title="Duplicar visualización"
              aria-label="Duplicar visualización"
              className="relative z-20 cursor-pointer px-2 py-1.5 text-muted hover:text-amber-500 hover:bg-card-hover rounded text-xs transition-colors"
            >
              {duplicating === spec.id ? '...' : <Copy size={14} />}
            </button>
            <button
              onClick={() => setConfirmDeleteId(spec.id)}
              disabled={deleting === spec.id}
              aria-label="Eliminar visualización"
              className="relative z-20 cursor-pointer px-2 py-1.5 text-muted hover:text-red-500 hover:bg-card-hover rounded text-xs transition-colors"
            >
              {deleting === spec.id ? '...' : <Trash2 size={14} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Group specs by source table when enabled.
  const grouped = useMemo(() => {
    if (!groupByTable) return null;
    const map = new Map<string, VizSpec[]>();
    for (const spec of filteredSpecs) {
      const table = spec.source_table ?? 'sin tabla';
      if (!map.has(table)) map.set(table, []);
      map.get(table)!.push(spec);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [groupByTable, filteredSpecs]);

  const renderTemplateName = (templateId: string | null): string => {
    if (!templateId) return 'Render';
    return TEMPLATE_NAMES[templateId] ?? templateId;
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Film size={20} className="text-amber-500" />
          <h1 className="text-2xl font-display font-bold">Historial</h1>
          <span className="text-xs text-muted">{specItems.length} total</span>
        </div>
      </div>

      {/* Visualizaciones guardadas (galería absorbida) */}
      <section>
        <h2 className="text-micro font-display font-bold uppercase tracking-widest text-muted mb-3">
          Visualizaciones guardadas
        </h2>

        {/* Search + sort + filter + group */}
        {specItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-elevated/60 border border-border-subtle p-2 mb-6">
            <div className="relative flex-1 min-w-52 max-w-xs">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o tabla..."
                aria-label="Buscar visualizaciones"
                className="w-full bg-card border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-1" role="group" aria-label="Filtrar por tipo de gráfico">
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
                  aria-label={t}
                  aria-pressed={typeFilter === t}
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

            <div className="flex items-center gap-1.5 ml-auto">
              <ArrowUpDown size={14} className="text-muted hidden sm:block" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                aria-label="Ordenar visualizaciones"
                className="bg-card border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="newest">Más recientes</option>
                <option value="oldest">Más antiguos</option>
                <option value="name-asc">Nombre A→Z</option>
                <option value="name-desc">Nombre Z→A</option>
              </select>

              <button
                onClick={() => setGroupByTable((v) => !v)}
                className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors ${
                  groupByTable
                    ? 'bg-amber-500 text-black font-semibold'
                    : 'bg-card text-secondary hover:text-primary'
                }`}
                aria-pressed={groupByTable}
              >
                <Folder size={14} /> Agrupar por tabla
              </button>
            </div>
          </div>
        )}

        {filteredSpecs.length === 0 ? (
          <div className="text-center py-16 text-muted">
            {specItems.length === 0 ? (
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
      </section>

      {/* Renders recientes */}
      <section>
        <h2 className="text-micro font-display font-bold uppercase tracking-widest text-muted mb-3">
          Renders recientes
        </h2>
        {renders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-default bg-card px-6 py-10 text-center">
            <Film size={20} className="text-muted" />
            <p className="text-sm text-muted">
              Todavía no hay renders. Generá un video desde el builder.
            </p>
            <Link href="/builder" className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-500 hover:text-amber-400 transition-colors font-display">
              <Plus size={14} /> Ir al Builder
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {renders.map((r) => {
              const status = r.status ?? '';
              const label = STATUS_LABEL[status] ?? status;
              return (
                <li key={r.id}>
                  <Link
                    href={`/render/${r.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border-default bg-card px-4 py-3 transition-colors hover:border-amber-500/50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-elevated text-muted">
                      <Film size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-primary">
                        {renderTemplateName(r.template_id)}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {formatDate(r.created_at)}
                        {typeof r.output_size === 'number' && r.output_size > 0
                          ? ` · ${(r.output_size / 1024 / 1024).toFixed(1)} MB`
                          : ''}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        status === 'done'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : status === 'error'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-slate-500/10 text-muted'
                      }`}
                    >
                      {status === 'done' ? (
                        <CheckCircle2 size={11} aria-hidden />
                      ) : status === 'error' ? (
                        <XCircle size={11} aria-hidden />
                      ) : (
                        <Clock size={11} aria-hidden />
                      )}
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="¿Eliminar visualización?"
        description="Esta acción no se puede deshacer y borrará la configuración y el historial asociado."
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
        confirmText="Eliminar"
        isDestructive
      />
    </div>
  );
}