import Link from 'next/link';
import {Plus} from 'lucide-react';

import {requireUser} from '@/lib/session';
import {BuilderNav} from '@/components/builder/builder-nav';
import {HistoryClient, type RenderRecord, type VizSpec} from '@/components/history/history-client';

export const dynamic = 'force-dynamic';

/**
 * Keep only renders whose video actually exists in Vercel Blob. The DB row can
 * be 'done' with a non-empty output_url while the file was deleted/expired, so
 * each URL is probed with a HEAD request in parallel. Fail-closed: on timeouts,
 * network errors or non-2xx the render is dropped.
 */
async function filterRendersWithBlob(renders: RenderRecord[]): Promise<RenderRecord[]> {
  if (renders.length === 0) return [];

  const results = await Promise.allSettled(
    renders.map((r) => {
      if (!r.output_url) return Promise.resolve(false);
      return fetch(r.output_url, {method: 'HEAD', cache: 'no-store'}).then((res) => res.ok);
    }),
  );

  return renders.filter((_, i) => results[i]?.status === 'fulfilled' && results[i].value);
}

export default async function HistoryPage() {
  const supabase = await requireUser();

  const [rendersRes, specsRes] = await Promise.all([
    supabase.rpc('list_renders_summary', {p_limit: 50}),
    supabase.rpc('list_viz_specs_summary', {p_limit: 200}),
  ]);

  if (rendersRes.error) console.error('[history] list_renders_summary:', rendersRes.error);
  if (specsRes.error) console.error('[history] list_viz_specs_summary:', specsRes.error);

  const renders = await filterRendersWithBlob((rendersRes.data ?? []) as RenderRecord[]);
  const specs = (specsRes.data ?? []) as VizSpec[];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 h-14 border-b border-border-default bg-background shrink-0">
        <BuilderNav />
        <Link
          href="/builder"
          className="flex items-center gap-1.5 px-4 h-9 bg-amber-500 hover:bg-amber-400 rounded-lg text-sm font-semibold text-black transition-colors font-display"
        >
          <Plus size={16} /> Nueva
        </Link>
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8">
        <HistoryClient renders={renders} specs={specs} />
      </main>
    </div>
  );
}