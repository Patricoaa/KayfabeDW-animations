'use client';

import {useEffect, useRef, useState} from 'react';
import {Eye, EyeOff, Settings2} from 'lucide-react';
import {PLATFORM_PRESETS, type PlatformId, type SafeZoneMargins, type SafeZoneSettings} from '@/lib/safe-zones';

const FIELD_LABELS: {key: keyof SafeZoneMargins; label: string}[] = [
  {key: 'top', label: 'Sup'},
  {key: 'left', label: 'Izq'},
  {key: 'bottom', label: 'Inf'},
  {key: 'right', label: 'Der'},
];

const PLATFORM_IDS: Exclude<PlatformId, 'custom'>[] = ['tiktok', 'reels', 'shorts'];

export function SafeZoneControls({
  settings,
  onChange,
  width,
  height,
}: {
  settings: SafeZoneSettings;
  onChange: (s: SafeZoneSettings) => void;
  width: number;
  height: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const m = settings.margins;
  const safeW = Math.max(0, width - m.left - m.right);
  const safeH = Math.max(0, height - m.top - m.bottom);

  const setMargin = (key: keyof SafeZoneMargins, value: number) => {
    const next = Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
    onChange({...settings, platform: 'custom', margins: {...m, [key]: next}});
  };

  const applyPreset = (id: Exclude<PlatformId, 'custom'>) => {
    onChange({...settings, platform: id, margins: {...PLATFORM_PRESETS[id].margins}});
  };

  return (
    <div ref={rootRef} className="absolute right-2 top-2 z-30 flex flex-col items-end">
      <div className="flex items-center gap-0.5 rounded-lg border border-border-default bg-card shadow-md">
        <button
          type="button"
          onClick={() => onChange({...settings, visible: !settings.visible})}
          aria-pressed={settings.visible}
          title={settings.visible ? 'Ocultar zonas seguras' : 'Mostrar zonas seguras'}
          className={`rounded-md p-1.5 transition-colors ${
            settings.visible ? 'text-amber-500' : 'text-muted hover:text-secondary'
          }`}
        >
          {settings.visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-pressed={open}
          title="Configurar zonas seguras"
          className={`rounded-md p-1.5 transition-colors ${
            open ? 'text-amber-500' : 'text-secondary hover:text-amber-500'
          }`}
        >
          <Settings2 size={14} />
        </button>
      </div>

      {open && (
        <div className="mt-1.5 w-64 rounded-lg border border-border-default bg-card p-3 shadow-xl">
          <label className="mb-2 block font-display text-[10px] font-semibold uppercase tracking-widest text-muted">
            Plataforma
          </label>
          <div className="flex flex-wrap gap-1">
            {PLATFORM_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => applyPreset(id)}
                aria-pressed={settings.platform === id}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                  settings.platform === id
                    ? 'bg-amber-500 text-black'
                    : 'bg-elevated text-secondary hover:bg-card-hover'
                }`}
              >
                {PLATFORM_PRESETS[id].label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onChange({...settings, platform: 'custom'})}
              aria-pressed={settings.platform === 'custom'}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                settings.platform === 'custom'
                  ? 'bg-amber-500 text-black'
                  : 'bg-elevated text-secondary hover:bg-card-hover'
              }`}
            >
              Personalizado
            </button>
          </div>

          <label className="mb-2 mt-3 block font-display text-[10px] font-semibold uppercase tracking-widest text-muted">
            Zonas muertas (px @1080×1920)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FIELD_LABELS.map(({key, label}) => (
              <label key={key} className="flex items-center gap-1.5">
                <span className="w-8 text-[10px] text-muted">{label}</span>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  value={m[key] ?? 0}
                  onChange={(e) => setMargin(key, Number(e.target.value))}
                  className="w-full rounded-md border border-border-default bg-elevated px-2 py-1 text-xs text-secondary focus:outline-none focus:ring-1 focus:ring-amber-500"
                  aria-label={`Margen ${label}`}
                />
              </label>
            ))}
          </div>

          <div className="mt-3 rounded-md bg-elevated px-2 py-1.5 text-[10px] text-secondary">
            Zona segura:{' '}
            <span className="font-mono">
              {safeW}×{safeH}
            </span>{' '}
            en <span className="font-mono">{width}×{height}</span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted">Solo preview · nunca se exporta</p>
        </div>
      )}
    </div>
  );
}