'use client';

import {Player} from '@remotion/player';
import React, {useCallback, useEffect, useState} from 'react';

type DataOption = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  default?: unknown;
  required?: boolean;
  min?: number;
  max?: number;
  options?: {value: string; label: string}[];
};

type TemplateSummary = {
  id: string;
  name: string;
  description: string;
  componentId: string;
  width: number;
  height: number;
  fps: number;
  defaultDuration: number;
  dataOptions: DataOption[];
};

type RenderState =
  | {status: 'idle'}
  | {status: 'rendering'; phase: string; progress: number}
  | {status: 'done'; url: string; size: number}
  | {status: 'error'; message: string};

type ViewState =
  | {view: 'list'}
  | {view: 'editor'; template: TemplateSummary};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TEMPLATE_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC<any>>> = {
  'ranking-barras': React.lazy(() =>
    import('../remotion/templates/ranking-barras').then((m) => ({default: m.RankingBarras})),
  ),
  'head-to-head': React.lazy(() =>
    import('../remotion/templates/head-to-head').then((m) => ({default: m.HeadToHead})),
  ),
  'timeline-reinados': React.lazy(() =>
    import('../remotion/templates/timeline-reinados').then((m) => ({default: m.TimelineReinados})),
  ),
  'stats-kpi': React.lazy(() =>
    import('../remotion/templates/stats-kpi').then((m) => ({default: m.StatsKpi})),
  ),
  'win-streak': React.lazy(() =>
    import('../remotion/templates/win-streak').then((m) => ({default: m.WinStreak})),
  ),
  'heatmap-luchas': React.lazy(() =>
    import('../remotion/templates/heatmap-luchas').then((m) => ({default: m.HeatmapLuchas})),
  ),
};

export default function AnimationsPage() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<ViewState>({view: 'list'});

  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-zinc-400">Cargando templates...</div>
      </div>
    );
  }

  if (state.view === 'editor') {
    return (
      <TemplateEditor
        template={state.template}
        onBack={() => setState({view: 'list'})}
      />
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Generador de Videos</h1>
        <a
          href="/builder"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm transition-colors"
        >
          Visual Builder
        </a>
      </div>

      {templates.length === 0 ? (
        <div className="text-zinc-400">No hay templates disponibles.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setState({view: 'editor', template: tpl})}
              className="text-left p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors"
            >
              <div className="text-lg font-semibold text-white mb-2">{tpl.name}</div>
              <div className="text-sm text-zinc-400 mb-3">{tpl.description}</div>
              <div className="text-xs text-zinc-500">
                {tpl.width}x{tpl.height} · {tpl.fps}fps · {tpl.defaultDuration}s
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateEditor({template, onBack}: {template: TemplateSummary; onBack: () => void}) {
  const [options, setOptions] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const opt of template.dataOptions) {
      if (opt.default !== undefined) initial[opt.key] = opt.default;
    }
    return initial;
  });
  const [props, setProps] = useState<Record<string, unknown> | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [renderState, setRenderState] = useState<RenderState>({status: 'idle'});
  const [durationSec, setDurationSec] = useState(template.defaultDuration);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safety: mount guard for Remotion Player
  useEffect(() => setMounted(true), []);

  const updateOption = useCallback((key: string, value: unknown) => {
    setOptions((prev) => ({...prev, [key]: value}));
  }, []);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const res = await fetch(`/api/templates/${template.id}/data`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({options}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setProps(data.props);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingData(false);
    }
  }, [template.id, options]);

  const handleRender = useCallback(async () => {
    if (!props) return;
    setRenderState({status: 'rendering', phase: 'Starting...', progress: 0});
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          compositionId: template.componentId,
          inputProps: props,
          durationInFrames: durationSec * template.fps,
        }),
      });
      const data = await res.json();
      if (data.type === 'done') {
        setRenderState({status: 'done', url: data.url, size: data.size});
      } else if (data.type === 'error') {
        setRenderState({status: 'error', message: data.message});
      } else {
        setRenderState({status: 'error', message: 'Unexpected response'});
      }
    } catch (err) {
      setRenderState({status: 'error', message: (err as Error).message});
    }
  }, [props, template.componentId, template.fps, durationSec]);

  const Comp = TEMPLATE_COMPONENTS[template.id];

  return (
    <div className="min-h-screen p-8">
      <button onClick={onBack} className="text-sm text-zinc-400 hover:text-white mb-6">
        &larr; Volver a templates
      </button>

      <h1 className="text-2xl font-bold mb-6">{template.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Preview */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Preview</h2>
          <div className="rounded-lg overflow-hidden border border-zinc-800 min-h-[360px]">
            {mounted && props && Comp && (
              <React.Suspense fallback={<div className="p-8 text-zinc-500">Cargando...</div>}>
                <Player
                  component={Comp}
                  inputProps={props}
                  durationInFrames={durationSec * template.fps}
                  fps={template.fps}
                  compositionWidth={template.width}
                  compositionHeight={template.height}
                  style={{width: '100%'}}
                  controls
                  acknowledgeRemotionLicense
                />
              </React.Suspense>
            )}
            {!props && (
              <div className="flex items-center justify-center h-[360px] text-zinc-500 text-sm">
                Configura los datos y haz clic en &quot;Cargar datos&quot; para ver la preview
              </div>
            )}
          </div>
        </div>

        {/* Configuration */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Configuración</h2>

          {/* Duration */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Duración (segundos)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={20}
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-sm text-zinc-300 w-20 text-right">
                {durationSec}s ({durationSec * template.fps} frames)
              </span>
            </div>
          </div>

          {/* Data options */}
          <div className="space-y-3 mb-4">
            {template.dataOptions.map((opt) => (
              <div key={opt.key}>
                <label className="block text-sm font-medium mb-1">{opt.label}</label>
                {opt.type === 'select' && opt.options ? (
                  <select
                    value={String(options[opt.key] ?? opt.default ?? '')}
                    onChange={(e) => updateOption(opt.key, e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
                  >
                    {opt.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : opt.type === 'number' ? (
                  <input
                    type="number"
                    value={Number(options[opt.key] ?? opt.default ?? 0)}
                    min={opt.min}
                    max={opt.max}
                    onChange={(e) => updateOption(opt.key, Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
                  />
                ) : (
                  <input
                    type="text"
                    value={String(options[opt.key] ?? opt.default ?? '')}
                    onChange={(e) => updateOption(opt.key, e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Load data button */}
          <button
            onClick={loadData}
            disabled={loadingData}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 text-white font-medium py-2 rounded-lg transition-colors mb-4"
          >
            {loadingData ? 'Cargando...' : 'Cargar datos'}
          </button>

          {dataError && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm mb-4">
              {dataError}
            </div>
          )}

          {/* Render button */}
          <button
            onClick={handleRender}
            disabled={!props || renderState.status === 'rendering'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {renderState.status === 'rendering' ? 'Renderizando...' : 'Generar Video'}
          </button>

          {/* Render progress */}
          {renderState.status === 'rendering' && (
            <div className="mt-4">
              <div className="text-sm text-zinc-400 mb-1">{renderState.phase}</div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{width: `${renderState.progress * 100}%`}}
                />
              </div>
            </div>
          )}

          {/* Render done */}
          {renderState.status === 'done' && (
            <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-lg">
              <p className="text-green-400 text-sm mb-2">
                Video generado ({(renderState.size / 1024 / 1024).toFixed(1)} MB)
              </p>
              <a
                href={renderState.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-sm"
              >
                Descargar video
              </a>
            </div>
          )}

          {/* Render error */}
          {renderState.status === 'error' && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-red-400 text-sm">{renderState.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
