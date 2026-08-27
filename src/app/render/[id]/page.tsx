import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireUser} from '@/lib/session';
import {TEMPLATES} from '@/remotion/generated/registry';
import {ArrowLeft, Film} from 'lucide-react';

export const dynamic = 'force-dynamic';

type RenderRecord = {
  id: string;
  template_id: string;
  status: string;
  input_props?: Record<string, unknown> | null;
  output_url?: string | null;
  output_size?: number | null;
  render_time_ms?: number | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
};

export default async function RenderDetailPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;

  const supabase = await requireUser();
  const {data, error} = await supabase.rpc('get_render', {p_id: id});
  if (error || !data) notFound();

  const render = data as unknown as RenderRecord;
  const entry = TEMPLATES[render.template_id as keyof typeof TEMPLATES];

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <Link
        href="/builder/gallery"
        className="inline-flex items-center gap-1 text-muted hover:text-primary transition-colors text-sm mb-6"
      >
        <ArrowLeft size={14} /> Volver
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Film size={20} className="text-amber-500" />
        <h1 className="text-2xl font-display font-bold">
          {entry?.meta.name ?? render.template_id}
        </h1>
      </div>

      <div className="bg-card border border-border-default rounded-lg overflow-hidden">
        {render.status !== 'done' ? (
          <div className="p-12 text-center text-muted">
            <p className="mb-2">Estado del render: <span className="text-primary">{render.status}</span></p>
            {render.error_message && (
              <p className="text-red-500 text-sm">{render.error_message}</p>
            )}
          </div>
        ) : render.output_url ? (
          <video
            src={render.output_url}
            controls
            autoPlay
            loop
            className="w-full bg-black"
            poster=""
          />
        ) : (
          <div className="p-12 text-center text-muted">Sin URL de salida</div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="p-4 bg-card border border-border-default rounded-lg">
          <div className="text-[10px] text-muted uppercase tracking-widest font-display mb-1">Template</div>
          <div className="font-mono text-xs">{render.template_id}</div>
        </div>
        <div className="p-4 bg-card border border-border-default rounded-lg">
          <div className="text-[10px] text-muted uppercase tracking-widest font-display mb-1">Estado</div>
          <div className="font-mono text-xs">{render.status}</div>
        </div>
        {typeof render.output_size === 'number' && render.output_size > 0 && (
          <div className="p-4 bg-card border border-border-default rounded-lg">
            <div className="text-[10px] text-muted uppercase tracking-widest font-display mb-1">Tamaño</div>
            <div className="font-mono text-xs">{(render.output_size / 1024 / 1024).toFixed(1)} MB</div>
          </div>
        )}
        {typeof render.completed_at === 'string' && (
          <div className="p-4 bg-card border border-border-default rounded-lg">
            <div className="text-[10px] text-muted uppercase tracking-widest font-display mb-1">Completado</div>
            <div className="font-mono text-xs text-secondary">
              {new Date(render.completed_at).toLocaleString('es')}
            </div>
          </div>
        )}
      </div>

      {render.status === 'done' && render.output_url && (
        <a
          href={render.output_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block px-4 py-2 bg-amber-500 hover:bg-amber-400 rounded text-sm font-semibold text-black transition-colors font-display"
        >
          Descargar MP4
        </a>
      )}
    </div>
  );
}