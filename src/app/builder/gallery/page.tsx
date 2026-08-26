'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';

type VizSpec = {
  id: string;
  name: string;
  chart_config: {type?: string; title?: string};
  created_at: string;
  updated_at: string;
};

export default function GalleryPage() {
  const [specs, setSpecs] = useState<VizSpec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/viz-specs')
      .then((r) => r.json())
      .then((data) => setSpecs(Array.isArray(data) ? data : []))
      .catch(() => setSpecs([]))
      .finally(() => setLoading(false));
  }, []);

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
          {specs.map((spec) => (
            <div
              key={spec.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium truncate">{spec.name}</h3>
                <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-800 rounded">
                  {spec.chart_config?.type ?? 'bar'}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Creado: {new Date(spec.created_at).toLocaleDateString('es')}
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/builder?edit=${spec.id}`}
                  className="flex-1 text-center px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs transition-colors"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
