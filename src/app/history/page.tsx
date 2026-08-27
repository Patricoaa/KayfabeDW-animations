import Link from 'next/link';
import {Film, Save, ArrowLeft} from 'lucide-react';
import {requireUser} from '@/lib/session';

export const dynamic = 'force-dynamic';

type RenderRecord = {
  id: string;
  template_id: string | null;
  status: string | null;
  output_url?: string | null;
  output_size?: number | null;
  render_time_ms?: number | null;
  error_message?: string | null;
  completed_at?: string | null;
  created_at: string;
};

type VizSpecRecord = {
  id: string;
  name: string;
  query_spec?: Record<string, unknown> | null;
  chart_config?: Record<string, unknown> | null;
  is_draft?: boolean;
  version?: number;
  updated_at: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  done: 'Listo',
  processing: 'Procesando',
  pending: 'Pendiente',
  error: 'Error',
};

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

export default async function HistoryPage() {
  const supabase = await requireUser();

  const [rendersRes, specsRes] = await Promise.all([
    supabase.rpc('list_renders', {p_limit: 30}),
    supabase.rpc('list_viz_specs'),
  ]);

  const renders = (Array.isArray(rendersRes.data) ? rendersRes.data : []) as RenderRecord[];
  const specs = (Array.isArray(specsRes.data) ? specsRes.data : []) as VizSpecRecord[];

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <Link
        href="/builder"
        className="inline-flex items-center gap-1 text-muted hover:text-primary transition-colors text-sm mb-6"
      >
        <ArrowLeft size={14} /> Volver al builder
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <Film size={20} className="text-amber-500" />
        <h1 className="text-2xl font-display font-bold">Historial</h1>
      </div>

      <section className="mb-10">
        <h2 className="text-sm font-display font-bold uppercase tracking-widest text-muted mb-3">
          Renders recientes
        </h2>
        {renders.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no hay renders. Generá un video desde el builder.
          </p>
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
                        {r.template_id ?? 'Render'}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {formatDate(r.created_at)}
                        {typeof r.output_size === 'number' && r.output_size > 0
                          ? ` · ${(r.output_size / 1024 / 1024).toFixed(1)} MB`
                          : ''}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        status === 'done'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : status === 'error'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-slate-500/10 text-muted'
                      }`}
                    >
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-display font-bold uppercase tracking-widest text-muted mb-3">
          Visualizaciones guardadas
        </h2>
        {specs.length === 0 ? (
          <p className="text-sm text-muted">
            No hay visualizaciones guardadas todavía.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {specs.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-border-default bg-card px-4 py-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-elevated text-muted">
                  <Save size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-primary">
                    {s.name}
                    {s.is_draft ? (
                      <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                        Borrador
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    v{s.version ?? 1} · {formatDate(s.updated_at)}
                  </span>
                </span>
                <Link
                  href={`/builder?edit=${s.id}`}
                  className="shrink-0 rounded-lg bg-elevated px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-amber-500 hover:text-black"
                >
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}