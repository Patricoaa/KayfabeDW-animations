'use client';

import React from 'react';
import {FONT_PRESETS} from '@/lib/chart-config';
import type {ChartConfig} from '@/lib/chart-config';
import type {TransversalBackground, VizTransversal} from '@/lib/viz-config';
import {Collapsible, SelectControl, ColorPickerControl, SliderNumberInput, FileUploadInput, PalettePicker} from '@/components/ui/controls';

// Sección "Configuración común": los campos que aplican a ESTÁTICO Y ANIMADO.
// Edita el nivel transversal (title/subtitle/colors/typography/background) y
// escribirlo-a-ambas-capas lo hace el builder (chart_config como espejo + los
// templates animados que no tengan override local). Prioridad local > transversal.

type CommonConfigPanelProps = {
  value: VizTransversal;
  onChange: (next: VizTransversal) => void;
};

const BG_TYPES: {value: NonNullable<TransversalBackground['type']>; label: string}[] = [
  {value: 'none', label: 'Ninguno'},
  {value: 'color', label: 'Color'},
  {value: 'pattern', label: 'Patrón'},
  {value: 'gradient', label: 'Degradado'},
  {value: 'image', label: 'Imagen'},
];

export function CommonConfigPanel({value, onChange}: CommonConfigPanelProps) {
  const setBg = (patch: Partial<TransversalBackground>) =>
    onChange({...value, background: {...(value.background ?? {}), ...patch}});
  const bgType = value.background?.type ?? 'none';
  const bg = value.background ?? {};
  const setPalette = (colors: string[]) => onChange({...value, colors});

  return (
    <>
      {/* ============ HEADER ============ */}
      <Collapsible title="Cabecera" defaultOpen>
        <div>
          <label className="text-sm font-medium mb-1 block">Título</label>
          <textarea
            value={value.title ?? ''}
            onChange={(e) => onChange({...value, title: e.target.value})}
            placeholder="Título de la visualización"
            rows={2}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Subtítulo</label>
          <textarea
            value={value.subtitle ?? ''}
            onChange={(e) => onChange({...value, subtitle: e.target.value})}
            placeholder="Subtítulo opcional"
            rows={2}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
          />
        </div>
        <p className="text-[10px] text-muted">
          Se aplica al gráfico estático y a la animación (las plantillas pueden sobreescribirlo individualmente).
        </p>
      </Collapsible>

      {/* ============ COLORES ============ */}
      <Collapsible title="Colores">
        <div>
          <label className="text-sm font-medium mb-1 block">Paleta de colores</label>
          <PalettePicker selected={value.colors ?? undefined} onSelect={setPalette} onClear={() => onChange({...value, colors: undefined})} />
        </div>
        <p className="text-[10px] text-muted">
          Colorea series y barras por defecto. El color por serie/categoría tiene prioridad.
        </p>
      </Collapsible>

      {/* ============ TIPOGRAFÍA ============ */}
      <Collapsible title="Tipografía">
        <div>
          <label className="text-sm font-medium mb-1 block">Fuente raíz</label>
          <SelectControl
            value={value.typography?.fontFamily ?? ''}
            onChange={(e) => onChange({...value, typography: {fontFamily: e.target.value || undefined}})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Sistema (predeterminado)</option>
            {FONT_PRESETS.map((f) => (
              <option key={f.name} value={f.family}>{f.name}</option>
            ))}
          </SelectControl>
        </div>
        <p className="text-[10px] text-muted">
          Fuente base para el estático y las plantillas que no definan una propia.
        </p>
      </Collapsible>

      {/* ============ LIENZO ============ */}
      <Collapsible title="Lienzo">
        <div>
          <label className="text-sm font-medium mb-1 block">Fondo del lienzo</label>
          <div className="flex gap-1 flex-wrap">
            {BG_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setBg({type: t.value})}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  bgType === t.value
                    ? 'bg-amber-500 text-black'
                    : 'bg-elevated text-secondary hover:bg-card-hover'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {bgType === 'color' && (
          <ColorPickerControl label="Color de fondo" value={bg.color ?? '#0a0a0a'} onChange={(v) => setBg({color: v || undefined})} />
        )}

        {bgType === 'pattern' && (
          <>
            <div>
              <label className="text-sm font-medium mb-1 block">Patrón</label>
              <SelectControl
                value={bg.pattern ?? 'dots'}
                onChange={(e) => setBg({pattern: e.target.value as NonNullable<ChartConfig['backgroundPattern']>})}
                className="w-full bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="dots">Puntos</option>
                <option value="stripes">Rayas</option>
                <option value="grid">Cuadrícula</option>
                <option value="checkers">Cuadros</option>
              </SelectControl>
            </div>
            {bg.pattern === 'stripes' && (
              <SliderNumberInput label="Ángulo (grados)" value={bg.angle ?? 45} min={0} max={360} step={15} onChange={(v) => setBg({angle: v || undefined})} />
            )}
            <ColorPickerControl label="Color del patrón" value={bg.color ?? '#3b82f6'} onChange={(v) => setBg({color: v || undefined})} />
            <SliderNumberInput label="Opacidad (%)" value={Math.round((bg.opacity ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => setBg({opacity: v ? v / 100 : undefined})} />
          </>
        )}

        {bgType === 'gradient' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <ColorPickerControl label="Color inicial" value={bg.color ?? '#0a0a0a'} onChange={(v) => setBg({color: v || undefined})} />
              <ColorPickerControl label="Color final" value={bg.secondary ?? '#1f2937'} onChange={(v) => setBg({secondary: v || undefined})} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Forma</label>
              <div className="flex gap-1">
                {([
                  {value: 'linear', label: 'Lineal'},
                  {value: 'radial', label: 'Radial'},
                ] as const).map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setBg({gradientShape: s.value})}
                    className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                      (bg.gradientShape ?? 'linear') === s.value
                        ? 'bg-amber-500 text-black'
                        : 'bg-elevated text-secondary hover:bg-card-hover'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {(bg.gradientShape ?? 'linear') === 'linear' ? (
              <SliderNumberInput label="Ángulo (grados)" value={bg.angle ?? 135} min={0} max={360} step={15} onChange={(v) => setBg({angle: v || undefined})} />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <SliderNumberInput label="Centro X (%)" value={bg.gradientCenterX ?? 50} min={0} max={100} step={5} onChange={(v) => setBg({gradientCenterX: v || undefined})} />
                <SliderNumberInput label="Centro Y (%)" value={bg.gradientCenterY ?? 50} min={0} max={100} step={5} onChange={(v) => setBg({gradientCenterY: v || undefined})} />
                <SliderNumberInput label="Radio (%)" value={bg.gradientRadius ?? 100} min={0} max={200} step={5} onChange={(v) => setBg({gradientRadius: v || undefined})} />
              </div>
            )}
            <SliderNumberInput label="Intensidad (%)" value={Math.round((bg.gradientBlend ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => setBg({gradientBlend: v / 100})} />
            <SliderNumberInput label="Suavizado (%)" value={Math.round((bg.gradientSmooth ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => setBg({gradientSmooth: v / 100})} />
            <SliderNumberInput label="Opacidad (%)" value={Math.round((bg.opacity ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => setBg({opacity: v ? v / 100 : undefined})} />
          </>
        )}

        {bgType === 'image' && (
          <>
            <FileUploadInput label="Imagen de fondo" value={bg.image ?? undefined} onLoad={(dataUrl) => setBg({image: dataUrl})} onClear={() => setBg({image: undefined})} />
            <div>
              <label className="text-sm font-medium mb-1 block">Ajuste</label>
              <SelectControl
                value={bg.fit ?? 'cover'}
                onChange={(e) => setBg({fit: e.target.value as NonNullable<ChartConfig['backgroundFit']>})}
                className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="cover">Cubrir</option>
                <option value="contain">Contener</option>
                <option value="fill">Rellenar</option>
              </SelectControl>
            </div>
            <ColorPickerControl label="Color base (debajo)" value={bg.color ?? '#0a0a0a'} onChange={(v) => setBg({color: v || undefined})} />
            <SliderNumberInput label="Opacidad (%)" value={Math.round((bg.opacity ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => setBg({opacity: v ? v / 100 : undefined})} />
          </>
        )}

        <SliderNumberInput label="Desenfoque del fondo (blur px)" value={bg.blur ?? 0} min={0} max={30} step={1} onChange={(v) => setBg({blur: v || undefined})} />

        <p className="text-[10px] text-muted">
          Fondo compartido. Las plantillas que definan su propio lienzo lo mantienen; las demás heredan este.
        </p>
      </Collapsible>
    </>
  );
}