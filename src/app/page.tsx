'use client';

import {Player} from '@remotion/player';
import {useCallback, useEffect, useState} from 'react';
import {RankingBarras} from '../remotion/templates/RankingBarras';
import {HeadToHead} from '../remotion/templates/HeadToHead';
import {TimelineReinados} from '../remotion/templates/TimelineReinados';
import {StatsKpi} from '../remotion/templates/StatsKpi';
import {WinStreak} from '../remotion/templates/WinStreak';
import {
  COMP_NAME,
  COMP_HEAD_TO_HEAD,
  COMP_TIMELINE,
  COMP_STATS_KPI,
  COMP_WIN_STREAK,
  defaultRankingBarrasProps,
  defaultHeadToHeadProps,
  defaultTimelineProps,
  defaultStatsKpiProps,
  defaultWinStreakProps,
  DURATION_IN_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from '../../types/constants';
import type {RankingBarrasProps} from '../../types/constants';
import type {HeadToHeadProps} from '../../types/constants';
import type {TimelineReinadosProps} from '../../types/constants';
import type {StatsKpiProps} from '../../types/constants';
import type {WinStreakProps} from '../../types/constants';

type Template = 'ranking' | 'head-to-head' | 'timeline' | 'stats-kpi' | 'win-streak';

const TEMPLATE_LABELS: Record<Template, string> = {
  'ranking': 'Ranking',
  'head-to-head': 'Head to Head',
  'timeline': 'Timeline',
  'stats-kpi': 'KPI',
  'win-streak': 'Racha',
};

type RenderState =
  | {status: 'idle'}
  | {status: 'rendering'; phase: string; progress: number}
  | {status: 'done'; url: string; size: number}
  | {status: 'error'; message: string};

export default function AnimationsPage() {
  const [template, setTemplate] = useState<Template>('ranking');
  const [renderState, setRenderState] = useState<RenderState>({status: 'idle'});
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const [rankingProps, setRankingProps] = useState<RankingBarrasProps>(defaultRankingBarrasProps);
  const [h2hProps, setH2hProps] = useState<HeadToHeadProps>(defaultHeadToHeadProps);
  const [timelineProps, setTimelineProps] = useState<TimelineReinadosProps>(defaultTimelineProps);
  const [kpiProps, setKpiProps] = useState<StatsKpiProps>(defaultStatsKpiProps);
  const [streakProps, setStreakProps] = useState<WinStreakProps>(defaultWinStreakProps);

  const [dataSource, setDataSource] = useState<'demo' | 'live'>('demo');

  const getActiveProps = () => {
    switch (template) {
      case 'ranking': return rankingProps;
      case 'head-to-head': return h2hProps;
      case 'timeline': return timelineProps;
      case 'stats-kpi': return kpiProps;
      case 'win-streak': return streakProps;
    }
  };

  const getCompId = () => {
    switch (template) {
      case 'ranking': return COMP_NAME;
      case 'head-to-head': return COMP_HEAD_TO_HEAD;
      case 'timeline': return COMP_TIMELINE;
      case 'stats-kpi': return COMP_STATS_KPI;
      case 'win-streak': return COMP_WIN_STREAK;
    }
  };

  const loadLiveData = useCallback(async (type: string) => {
    try {
      const res = await fetch(`/api/data/ranking?type=${type}&limit=8`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRankingProps({title: data.title, items: data.items, maxValue: data.maxValue});
      setDataSource('live');
    } catch (err) {
      console.error('Failed to load live data:', err);
    }
  }, []);

  const loadTimelineData = useCallback(async (champion: string) => {
    try {
      const res = await fetch(`/api/data/timeline?champion=${encodeURIComponent(champion)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTimelineProps(data);
      setDataSource('live');
    } catch (err) {
      console.error('Failed to load timeline data:', err);
    }
  }, []);

  const handleRender = useCallback(async () => {
    setRenderState({status: 'rendering', phase: 'Starting...', progress: 0});
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({compositionId: getCompId(), inputProps: getActiveProps()}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n').filter((l) => l.startsWith('data: '));
        for (const line of lines) {
          const data = JSON.parse(line.slice(6));
          setRenderState(data);
          if (data.type === 'done' || data.type === 'error') return;
        }
      }
    } catch (err) {
      setRenderState({status: 'error', message: (err as Error).message});
    }
  }, [template, rankingProps, h2hProps, timelineProps, kpiProps, streakProps]);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Generador de Videos</h1>

      <div className="flex gap-2 mb-6">
        {(Object.keys(TEMPLATE_LABELS) as Template[]).map((t) => (
          <button
            key={t}
            onClick={() => setTemplate(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              template === t ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {TEMPLATE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Preview</h2>
          <div className="rounded-lg overflow-hidden border border-zinc-800 min-h-[360px]">
            {mounted && template === 'ranking' && (
              <Player component={RankingBarras} inputProps={rankingProps}
                durationInFrames={DURATION_IN_FRAMES} fps={VIDEO_FPS}
                compositionWidth={VIDEO_WIDTH} compositionHeight={VIDEO_HEIGHT}
                style={{width: '100%'}} controls acknowledgeRemotionLicense />
            )}
            {mounted && template === 'head-to-head' && (
              <Player component={HeadToHead} inputProps={h2hProps}
                durationInFrames={DURATION_IN_FRAMES} fps={VIDEO_FPS}
                compositionWidth={VIDEO_WIDTH} compositionHeight={VIDEO_HEIGHT}
                style={{width: '100%'}} controls acknowledgeRemotionLicense />
            )}
            {mounted && template === 'timeline' && (
              <Player component={TimelineReinados} inputProps={timelineProps}
                durationInFrames={DURATION_IN_FRAMES} fps={VIDEO_FPS}
                compositionWidth={VIDEO_WIDTH} compositionHeight={VIDEO_HEIGHT}
                style={{width: '100%'}} controls acknowledgeRemotionLicense />
            )}
            {mounted && template === 'stats-kpi' && (
              <Player component={StatsKpi} inputProps={kpiProps}
                durationInFrames={DURATION_IN_FRAMES} fps={VIDEO_FPS}
                compositionWidth={VIDEO_WIDTH} compositionHeight={VIDEO_HEIGHT}
                style={{width: '100%'}} controls acknowledgeRemotionLicense />
            )}
            {mounted && template === 'win-streak' && (
              <Player component={WinStreak} inputProps={streakProps}
                durationInFrames={DURATION_IN_FRAMES} fps={VIDEO_FPS}
                compositionWidth={VIDEO_WIDTH} compositionHeight={VIDEO_HEIGHT}
                style={{width: '100%'}} controls acknowledgeRemotionLicense />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Configuración</h2>

          {template === 'ranking' && (
            <RankingEditor props={rankingProps} onChange={setRankingProps}
              onLoadLiveData={loadLiveData} dataSource={dataSource} />
          )}
          {template === 'head-to-head' && (
            <HeadToHeadEditor props={h2hProps} onChange={setH2hProps} />
          )}
          {template === 'timeline' && (
            <TimelineEditor props={timelineProps} onChange={setTimelineProps}
              onLoadData={loadTimelineData} />
          )}
          {template === 'stats-kpi' && (
            <KpiEditor props={kpiProps} onChange={setKpiProps} />
          )}
          {template === 'win-streak' && (
            <WinStreakEditor props={streakProps} onChange={setStreakProps} />
          )}

          <button
            onClick={handleRender}
            disabled={renderState.status === 'rendering'}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {renderState.status === 'rendering' ? 'Renderizando...' : 'Generar Video'}
          </button>

          {renderState.status === 'rendering' && (
            <div className="mt-4">
              <div className="text-sm text-zinc-400 mb-1">{renderState.phase}</div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{width: `${renderState.progress * 100}%`}} />
              </div>
            </div>
          )}

          {renderState.status === 'done' && (
            <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-lg">
              <p className="text-green-400 text-sm mb-2">
                Video generado ({(renderState.size / 1024 / 1024).toFixed(1)} MB)
              </p>
              <a href={renderState.url} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-sm">
                Descargar video
              </a>
            </div>
          )}

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

// --- Editors ---

function RankingEditor({props, onChange, onLoadLiveData, dataSource}: {
  props: RankingBarrasProps;
  onChange: (p: RankingBarrasProps) => void;
  onLoadLiveData: (type: string) => void;
  dataSource: 'demo' | 'live';
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Título</label>
        <input type="text" value={props.title}
          onChange={(e) => onChange({...props, title: e.target.value})}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Cargar datos</label>
        <div className="flex gap-2">
          <button onClick={() => onLoadLiveData('title_reigns')}
            className={`px-3 py-1.5 rounded text-xs font-medium ${dataSource === 'live' ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
            Reinados (DB)
          </button>
          <button onClick={() => onLoadLiveData('active_champs')}
            className={`px-3 py-1.5 rounded text-xs font-medium ${dataSource === 'live' ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
            Campeones Activos (DB)
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Items</label>
        {props.items.map((item, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input type="text" value={item.label}
              onChange={(e) => {const items = [...props.items]; items[i] = {...items[i], label: e.target.value}; onChange({...props, items});}}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
            <input type="number" value={item.value}
              onChange={(e) => {const items = [...props.items]; items[i] = {...items[i], value: Number(e.target.value)}; onChange({...props, items});}}
              className="w-24 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HeadToHeadEditor({props, onChange}: {props: HeadToHeadProps; onChange: (p: HeadToHeadProps) => void}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Luchador A</label>
          <input type="text" value={props.wrestlerA}
            onChange={(e) => onChange({...props, wrestlerA: e.target.value})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
          <input type="text" value={props.titleA ?? ''} placeholder="Título"
            onChange={(e) => onChange({...props, titleA: e.target.value || undefined})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm mt-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Luchador B</label>
          <input type="text" value={props.wrestlerB}
            onChange={(e) => onChange({...props, wrestlerB: e.target.value})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
          <input type="text" value={props.titleB ?? ''} placeholder="Título"
            onChange={(e) => onChange({...props, titleB: e.target.value || undefined})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Victorias A</label>
          <input type="number" value={props.winsA}
            onChange={(e) => onChange({...props, winsA: Number(e.target.value)})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Victorias B</label>
          <input type="number" value={props.winsB}
            onChange={(e) => onChange({...props, winsB: Number(e.target.value)})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Empates</label>
          <input type="number" value={props.draws ?? 0}
            onChange={(e) => onChange({...props, draws: Number(e.target.value)})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
        </div>
      </div>
    </div>
  );
}

function TimelineEditor({props, onChange, onLoadData}: {
  props: TimelineReinadosProps;
  onChange: (p: TimelineReinadosProps) => void;
  onLoadData: (champion: string) => void;
}) {
  const [searchName, setSearchName] = useState(props.championName);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Campeón</label>
          <input type="text" value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Título</label>
          <input type="text" value={props.titleName}
            onChange={(e) => onChange({...props, titleName: e.target.value})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
        </div>
      </div>
      <button onClick={() => onLoadData(searchName)}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium">
        Cargar desde DB
      </button>
      <div>
        <label className="block text-sm font-medium mb-2">Reinados</label>
        {props.reigns.map((reign, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-2">
            <input type="text" value={reign.start} placeholder="Inicio"
              onChange={(e) => {const reigns = [...props.reigns]; reigns[i] = {...reigns[i], start: e.target.value}; onChange({...props, reigns});}}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs" />
            <input type="text" value={reign.end ?? ''} placeholder="Fin"
              onChange={(e) => {const reigns = [...props.reigns]; reigns[i] = {...reigns[i], end: e.target.value || null}; onChange({...props, reigns});}}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs" />
            <input type="number" value={reign.days} placeholder="Días"
              onChange={(e) => {const reigns = [...props.reigns]; reigns[i] = {...reigns[i], days: Number(e.target.value)}; onChange({...props, reigns});}}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs" />
            <input type="number" value={reign.defenses} placeholder="Defensas"
              onChange={(e) => {const reigns = [...props.reigns]; reigns[i] = {...reigns[i], defenses: Number(e.target.value)}; onChange({...props, reigns});}}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs" />
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiEditor({props, onChange}: {props: StatsKpiProps; onChange: (p: StatsKpiProps) => void}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Label</label>
        <input type="text" value={props.label}
          onChange={(e) => onChange({...props, label: e.target.value})}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Valor</label>
          <input type="number" value={props.value}
            onChange={(e) => onChange({...props, value: Number(e.target.value)})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sufijo</label>
          <input type="text" value={props.suffix ?? ''}
            onChange={(e) => onChange({...props, suffix: e.target.value || undefined})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" placeholder="ej: %" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Descripción</label>
        <input type="text" value={props.description ?? ''}
          onChange={(e) => onChange({...props, description: e.target.value || undefined})}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
      </div>
    </div>
  );
}

function WinStreakEditor({props, onChange}: {props: WinStreakProps; onChange: (p: WinStreakProps) => void}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Luchador</label>
          <input type="text" value={props.wrestlerName}
            onChange={(e) => onChange({...props, wrestlerName: e.target.value})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Racha</label>
          <input type="number" value={props.streakCount}
            onChange={(e) => onChange({...props, streakCount: Number(e.target.value)})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Tipo de match</label>
        <input type="text" value={props.matchType ?? ''}
          onChange={(e) => onChange({...props, matchType: e.target.value || undefined})}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm" />
      </div>
    </div>
  );
}
