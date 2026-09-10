'use client';

import React, {useState} from 'react';
import { SelectControl, NumberControl, ColorPickerControl, SwitchControl, Collapsible, Tabs, TextStyleControls, SliderNumberInput, FileUploadInput, FieldSelect, EntitySearch, PalettePicker, OverlayEditor, AudioUploadInput } from '@/components/ui/controls';
import type {ColumnMeta} from '@/components/builder/chart-config-panel';
import type {TimelineRaceConfig, RaceScrollingConfig, RankingConfig, DateFormat, AvatarShape, AvatarCrop, RaceTextStyle, ValueFormat, RowEntryElement, CommonHeaderConfig, CommonCanvasConfig} from '@/lib/animation-config';
import {avatarCropRect, VALUE_FORMATS} from '@/lib/animation-config';
import {ICON_GLYPHS, ICON_GLYPH_NAMES} from '@/lib/chart-icons';

type Participant = {label: string; image?: string | null};

// Per-element row entry overrides: the four movable pieces of a ranking row,
// each able to pick its own entry direction and sequential delay.
const ROW_ENTRY_ELEMENTS: {id: RowEntryElement; label: string}[] = [
  {id: 'rank', label: 'Puesto (#)'},
  {id: 'avatar', label: 'Avatar'},
  {id: 'bar', label: 'Barra / etiqueta'},
  {id: 'value', label: 'Dato (valor)'},
];

type AnimationConfigPanelProps = {
  templateId: string;
  columns: string[];
  fieldMeta: ColumnMeta[];
  value: TimelineRaceConfig | RaceScrollingConfig | RankingConfig;
  onChange: (next: TimelineRaceConfig | RaceScrollingConfig | RankingConfig) => void;
  participants?: Participant[];
  templateSelector?: React.ReactNode;
};


// Title + subtitle, position offsets and typography. Reused by every template
// so the header settings stay identical everywhere.
function HeaderSection({value, update}: {value: CommonHeaderConfig; update: (patch: Partial<CommonHeaderConfig>) => void}) {
  return (
    <Collapsible title="Header" defaultOpen>
      <div>
        <label className="text-sm font-medium mb-1 block">Título (multilínea)</label>
        <textarea
          value={value.title ?? ''}
          onChange={(e) => update({title: e.target.value || undefined})}
          placeholder="Título de la animación"
          rows={2}
          className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
        />
        <p className="text-[10px] text-muted mt-0.5">
          Si se deja vacío se usa el título de la visualización. Usa Enter para saltar de línea.
        </p>
      </div>
      <div className="pt-2 mt-1 border-t border-border-subtle">
        <p className="text-[10px] text-muted mb-1.5">Posición del título (offset en px desde su lugar por defecto).</p>
        <div className="grid grid-cols-2 gap-2">
          <NumberControl label="X (px)" value={value.titleX} step={4} onChange={(v) => update({titleX: v})} />
          <NumberControl label="Y (px)" value={value.titleY} step={4} onChange={(v) => update({titleY: v})} />
        </div>
      </div>
      <div className="pt-2 mt-1 border-t border-border-subtle">
        <TextStyleControls label="Texto del título" value={value.titleText} onChange={(patch) => update({titleText: {...(value.titleText ?? {}), ...patch}})}  showTextTransform showSpacing showHighlight showUnderline maxSize={160}/>
      </div>
      <div className="pt-2 mt-1 border-t border-border-subtle">
        <label className="text-sm font-medium mb-1 block">Subtítulo</label>
        <input
          type="text"
          value={value.subtitle ?? ''}
          onChange={(e) => update({subtitle: e.target.value || undefined})}
          placeholder="Subtítulo (opcional)"
          className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div className="pt-2 mt-1 border-t border-border-subtle">
        <p className="text-[10px] text-muted mb-1.5">Posición del subtítulo (offset en px desde su lugar por defecto).</p>
        <div className="grid grid-cols-2 gap-2">
          <NumberControl label="X (px)" value={value.subtitleX} step={4} onChange={(v) => update({subtitleX: v})} />
          <NumberControl label="Y (px)" value={value.subtitleY} step={4} onChange={(v) => update({subtitleY: v})} />
        </div>
      </div>
      <div className="pt-2 mt-1 border-t border-border-subtle">
        <TextStyleControls label="Texto del subtítulo" value={value.subtitleText} onChange={(patch) => update({subtitleText: {...(value.subtitleText ?? {}), ...patch}})}  showTextTransform showSpacing showHighlight showUnderline maxSize={160}/>
      </div>
    </Collapsible>
  );
}

// Canvas background: type, colors and pattern/gradient/image options. Reused by
// every template so the canvas settings stay identical everywhere.
function CanvasSection({value, update}: {value: CommonCanvasConfig; update: (patch: Partial<CommonCanvasConfig>) => void}) {
  return (
    <Collapsible title="Lienzo">
      <SelectControl
        label="Tipo de fondo"
        value={value.backgroundType ?? 'color'}
        options={[
          {value: 'color', label: 'Color único'},
          {value: 'pattern', label: 'Patrón'},
          {value: 'gradient', label: 'Degradado'},
          {value: 'image', label: 'Imagen'},
        ]}
        onChange={(e) => update({backgroundType: e.target.value as CommonCanvasConfig['backgroundType']})}
      />

      {(value.backgroundType ?? 'color') === 'color' && (
        <ColorPickerControl label="Color de fondo" value={value.background ?? '#0a0a0a'} onChange={(v) => update({background: v || undefined})} />
      )}

      {(value.backgroundType ?? 'color') === 'pattern' && (
        <>
          <SelectControl
            label="Patrón"
            value={value.backgroundPattern ?? 'dots'}
            options={[
              {value: 'dots', label: 'Puntos'},
              {value: 'stripes', label: 'Rayas'},
              {value: 'grid', label: 'Cuadrícula'},
              {value: 'checkers', label: 'Cuadros'},
            ]}
            onChange={(e) => update({backgroundPattern: e.target.value as CommonCanvasConfig['backgroundPattern']})}
          />
          <ColorPickerControl label="Color del patrón" value={value.background ?? '#3b82f6'} onChange={(v) => update({background: v || undefined})} />
          <SliderNumberInput label="Opacidad (%)" value={Math.round((value.backgroundOpacity ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => update({backgroundOpacity: v ? v / 100 : undefined})} />
        </>
      )}

      {(value.backgroundType ?? 'color') === 'gradient' && (
        <>
          <ColorPickerControl label="Color inicial" value={value.background ?? '#0a0a0a'} onChange={(v) => update({background: v || undefined})} />
          <ColorPickerControl label="Color final" value={value.backgroundSecondary ?? '#1f2937'} onChange={(v) => update({backgroundSecondary: v || undefined})} />
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
                  onClick={() => update({backgroundGradientShape: s.value})}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    (value.backgroundGradientShape ?? 'linear') === s.value
                      ? 'bg-amber-500 text-black'
                      : 'bg-elevated text-secondary hover:bg-card-hover'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {(value.backgroundGradientShape ?? 'linear') === 'linear' ? (
            <SliderNumberInput label="Ángulo (grados)" value={value.backgroundAngle ?? 135} min={0} max={360} step={15} onChange={(v) => update({backgroundAngle: v || undefined})} />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <SliderNumberInput label="Centro X (%)" value={value.backgroundGradientCenterX ?? 50} min={0} max={100} step={5} onChange={(v) => update({backgroundGradientCenterX: v})} />
              <SliderNumberInput label="Centro Y (%)" value={value.backgroundGradientCenterY ?? 50} min={0} max={100} step={5} onChange={(v) => update({backgroundGradientCenterY: v})} />
              <SliderNumberInput label="Radio (%)" value={value.backgroundGradientRadius ?? 100} min={0} max={200} step={5} onChange={(v) => update({backgroundGradientRadius: v})} />
            </div>
          )}
          <SliderNumberInput label="Intensidad (%)" value={Math.round((value.backgroundGradientBlend ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => update({backgroundGradientBlend: v / 100})} />
          <SliderNumberInput label="Suavizado (%)" value={Math.round((value.backgroundGradientSmooth ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => update({backgroundGradientSmooth: v / 100})} />
          <SliderNumberInput label="Opacidad (%)" value={Math.round((value.backgroundOpacity ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => update({backgroundOpacity: v ? v / 100 : undefined})} />
        </>
      )}

      {(value.backgroundType ?? 'color') === 'image' && (
        <>
          <FileUploadInput
            label="Imagen de fondo"
            value={value.backgroundImage}
            onLoad={(dataUrl) => update({backgroundImage: dataUrl})}
            onClear={() => update({backgroundImage: undefined})}
          />
          <SelectControl
            label="Ajuste"
            value={value.backgroundFit ?? 'cover'}
            options={[
              {value: 'cover', label: 'Cubrir'},
              {value: 'contain', label: 'Contener'},
              {value: 'fill', label: 'Rellenar'},
            ]}
            onChange={(e) => update({backgroundFit: e.target.value as CommonCanvasConfig['backgroundFit']})}
          />
          <SelectControl
            label="Animación"
            value={value.backgroundAnim ?? 'none'}
            options={[
              {value: 'none', label: 'Sin animación'},
              {value: 'mirror', label: 'Espejo (loop)'},
            ]}
            onChange={(e) => update({backgroundAnim: e.target.value as CommonCanvasConfig['backgroundAnim']})}
          />
          {(value.backgroundAnim ?? 'none') === 'mirror' && (
            <SliderNumberInput label="Flip cada (frames)" value={Math.round(value.backgroundAnimSpeed ?? 60)} min={10} max={300} step={10} onChange={(v) => update({backgroundAnimSpeed: v || undefined})} />
          )}
          <ColorPickerControl label="Color base (debajo)" value={value.background ?? '#0a0a0a'} onChange={(v) => update({background: v || undefined})} />
          <SliderNumberInput label="Opacidad (%)" value={Math.round((value.backgroundOpacity ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => update({backgroundOpacity: v ? v / 100 : undefined})} />
        </>
      )}

      <SliderNumberInput label="Desenfoque del fondo (blur px)" value={value.backgroundBlur ?? 0} min={0} max={30} step={1} onChange={(v) => update({backgroundBlur: v || undefined})} />
    </Collapsible>
  );
}

// Avatar fields shared by the Timeline Race and Ranking configs. The caller
// merges the emitted patch into its own config object.
type AvatarFields = {
  showAvatar?: boolean;
  avatarSize?: number;
  avatarShape?: AvatarShape;
  avatarRadius?: number;
  avatarCrops?: Record<string, AvatarCrop>;
  avatarBg?: string;
  avatarBgFromBar?: boolean;
  avatarBorderColor?: string;
  avatarBorderWidth?: number;
};

// Per-template Avatar section (size, shape, radius + per-entity crop). Shared
// by both animated templates so the controls stay identical.
function AvatarSection({value, onChange, participants = [], withBarColor = false, extra}: {
  value: AvatarFields;
  onChange: (patch: Partial<AvatarFields>) => void;
  participants?: Participant[];
  withBarColor?: boolean;
  extra?: React.ReactNode;
}) {
  const [avatarQ, setAvatarQ] = useState('');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matchQ = (label: string, q: string) => (q.trim() === '' ? true : norm(label).includes(norm(q)));
  const filteredCrops = participants.filter((p) => matchQ(p.label, avatarQ));
  const setCrop = (label: string, patch?: Partial<AvatarCrop>) => {
    const next = {...(value.avatarCrops ?? {})};
    if (patch) next[label] = {...(next[label] ?? {}), ...patch};
    else delete next[label];
    onChange({avatarCrops: next});
  };
  return (
    <Collapsible title="Avatar">
      <SwitchControl label="Mostrar avatares" checked={value.showAvatar ?? true} onChange={(v) => onChange({showAvatar: v})} />
      <NumberControl
          label="Tamaño"
          value={value.avatarSize}
          min={16}
          max={160}
          step={2}
          onChange={(v) => onChange({avatarSize: v})}
          description="Vacío = automático según el tamaño del lienzo."
        />
      <div>
        <label className="text-sm font-medium mb-1 block">Forma</label>
        <div className="grid grid-cols-2 gap-1">
          {(['circle', 'rounded'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({avatarShape: s as AvatarShape})}
              className={`px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                (value.avatarShape ?? 'circle') === s
                  ? 'bg-amber-500 text-black'
                  : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
              }`}
            >
              {s === 'circle' ? 'Círculo' : 'Redondeado'}
            </button>
          ))}
        </div>
      </div>
      {(value.avatarShape ?? 'circle') === 'rounded' && (
        <NumberControl label="Radio de esquina (vacío = auto)" value={value.avatarRadius} min={0} max={60} step={1} onChange={(v) => onChange({avatarRadius: v})} />
      )}
      {extra}
      <div>
        <label className="text-sm font-medium mb-1 block">Fondo del avatar</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={value.avatarBg && value.avatarBg !== 'transparent' ? value.avatarBg : '#1f2937'}
            onChange={(e) => onChange({avatarBg: e.target.value})}
            className="h-8 w-8 rounded border border-border-default cursor-pointer"
          />
          <button
            type="button"
            onClick={() => onChange({avatarBg: 'transparent'})}
            className={`text-xs px-2 py-1 rounded border ${
              value.avatarBg === 'transparent'
                ? 'border-amber-500 text-amber-400'
                : 'border-border-default text-muted hover:text-primary'
            }`}
          >
            Transparente
          </button>
        </div>
      </div>
      {withBarColor && (
        <>
          <SwitchControl
            label="Fondo desde color de barra"
            checked={value.avatarBgFromBar ?? false}
            onChange={(v) => onChange({avatarBgFromBar: v})}
          />
          <p className="text-[10px] text-muted">Cada avatar usa el color de su barra como fondo (ignora el color anterior).</p>
        </>
      )}
      <div>
        <label className="text-sm font-medium mb-1 block">Borde del avatar</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={value.avatarBorderColor ?? '#ffffff'}
            onChange={(e) => onChange({avatarBorderColor: e.target.value})}
            className="h-8 w-8 rounded border border-border-default cursor-pointer"
          />
          <input
            type="number"
            min={0} max={16} step={1}
            value={value.avatarBorderWidth ?? ''}
            placeholder="Grosor (px)"
            onChange={(e) => onChange({avatarBorderWidth: e.target.value ? Number(e.target.value) : undefined})}
            className="w-24 bg-elevated border border-border-default rounded-lg px-2 py-1 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <p className="text-[10px] text-muted mt-0.5">Color y grosor en px (0 = sin borde).</p>
      </div>
      {participants.length > 0 && (
        <div className="pt-2 border-t border-border-subtle">
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-sm font-medium block">Ajustar por entidad</label>
            {Object.keys(value.avatarCrops ?? {}).length > 0 && (
              <button type="button" onClick={() => onChange({avatarCrops: undefined})} className="text-[10px] text-muted hover:text-red-500">
                Limpiar todas
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted mb-1.5">Zoom y foco del recorte dentro del marco de cada avatar.</p>
          <EntitySearch value={avatarQ} onChange={setAvatarQ} shown={filteredCrops.length} total={participants.length} />
          <div className="space-y-2">
            {filteredCrops.map((p) => {
              const cr = value.avatarCrops?.[p.label];
              const PREVIEW = 40;
              const crop = avatarCropRect(cr?.zoom, cr?.focusX, cr?.focusY, PREVIEW);
              const clipStyle = p.image
                ? {
                    position: 'relative' as const,
                    width: PREVIEW,
                    height: PREVIEW,
                    borderRadius: (value.avatarShape ?? 'circle') === 'circle' ? '50%' : '8px',
                    overflow: 'hidden' as const,
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)',
                  }
                : undefined;
              const imgStyle = p.image
                ? {
                    width: crop.w,
                    height: crop.h,
                    transform: `translate(${-crop.w / 2 + crop.dx}px, ${-crop.h / 2 + crop.dy}px)`,
                    objectFit: 'contain' as const,
                    maxWidth: 'none',
                  }
                : undefined;
              return (
                <div key={p.label} className="border border-border-subtle rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-secondary truncate" title={p.label}>{p.label}</span>
                    {cr && (
                      <button type="button" onClick={() => setCrop(p.label)} className="text-muted hover:text-red-500 text-xs" aria-label={`Resetear recorte de ${p.label}`}>✕</button>
                    )}
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-1">
                      {p.image ? (
                        <div style={clipStyle}>
                          <img src={p.image} alt="" style={{...imgStyle, position: 'absolute' as const, left: '50%', top: '50%', objectFit: 'contain' as const, maxWidth: 'none'}} />
                        </div>
                      ) : (
                        <div style={{...clipStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)'}}>
                          <span className="text-muted">sin img</span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <NumberControl label="Zoom" value={cr?.zoom} min={0.1} max={3} step={0.05} onChange={(v) => setCrop(p.label, {...cr, zoom: v})} />
                      <NumberControl label="Foco X" value={cr ? (cr.focusX ?? 0) * 100 : 0} min={-100} max={100} step={5} onChange={(v) => setCrop(p.label, {...cr, focusX: (v ?? 0) / 100})} />
                      <NumberControl label="Foco Y" value={cr ? (cr.focusY ?? 0) * 100 : 0} min={-100} max={100} step={5} onChange={(v) => setCrop(p.label, {...cr, focusY: (v ?? 0) / 100})} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Collapsible>
  );
}

// Typed subset for the Timeline Race branch (its config is a superset of the
// shared fields, so the union prop is narrowed here for convenient access).
type TimelineRacePanelProps = Omit<AnimationConfigPanelProps, 'value' | 'onChange'> & {
  value: TimelineRaceConfig;
  onChange: (next: TimelineRaceConfig) => void;
};

// Timeline Race config UI: header (shared) + cols + x/y axis + date + ranking
// reveal + avatar + bars + label + canvas (shared).
function TimelineRacePanel({templateId, columns, fieldMeta, value, onChange, participants = [], templateSelector}: TimelineRacePanelProps) {
  const update = (patch: Partial<TimelineRaceConfig>) => onChange({...value, ...patch});
  const fmt = (value.dateFormat ?? 'day') as DateFormat;
  const setBarColor = (label: string, color?: string) => {
    const next = {...(value.barColors ?? {})};
    if (color) next[label] = color;
    else delete next[label];
    update({barColors: next});
  };
  const setRowOrder = (order: ('bar' | 'avatar')[]) => update({rowOrder: order});

  // Per-entity list filtering (zoom/focus + colors): accent/case-insensitive
  // substring match against the label, so "habana" finds "La Habana".
  const [colorQ, setColorQ] = useState('');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matchQ = (label: string, q: string) => (q.trim() === '' ? true : norm(label).includes(norm(q)));
  const filteredColors = participants.filter((p) => matchQ(p.label, colorQ));
  const barPalette = value.barPalette ?? [];
  const palIndex = new Map(participants.map((p, i) => [p.label, i]));
  const setBarPalette = (colors?: string[]) => update({barPalette: colors});

  return (
    <Tabs
      tabs={[{ id: 'data', label: 'Datos' }, { id: 'design', label: 'Diseño' }]}
      className="h-full"
    >
      {(activeTab) => (
        <div className="space-y-4 pb-12">
          {activeTab === 'data' && (
            <>
              {templateSelector}

              <Collapsible title="Datos" defaultOpen>
        <FieldSelect
          label="Entidad / etiqueta"
          value={value.labelField ?? ''}
          options={fieldMeta}
          fallback={columns}
          onChange={(v) => update({labelField: v || undefined})}
        />
        <FieldSelect
          label="Imagen de la entidad (opcional)"
          value={value.imageField ?? ''}
          options={fieldMeta}
          fallback={columns}
          role="any"
          optional
          onChange={(v) => update({imageField: v || undefined})}
        />
        <FieldSelect
          label="Campo de fecha"
          value={value.dateField ?? ''}
          options={fieldMeta}
          fallback={columns}
          role="date"
          onChange={(v) => update({dateField: v || undefined})}
        />
        <FieldSelect
          label="Campo de valor acumulado"
          value={value.valueField ?? ''}
          options={fieldMeta}
          fallback={columns}
          role="numeric"
          onChange={(v) => update({valueField: v || undefined})}
        />
        <div>
          <label className="text-sm font-medium mb-1 block">Agregación por periodo</label>
          <SelectControl
            value={value.valueAgg ?? 'sum'}
            onChange={(e) => update({valueAgg: e.target.value as TimelineRaceConfig['valueAgg']})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="sum">Suma</option>
            <option value="count">Conteo</option>
            <option value="avg">Promedio</option>
            <option value="min">Mínimo</option>
            <option value="max">Máximo</option>
            <option value="last">Último valor</option>
          </SelectControl>
          <p className="text-[10px] text-muted mt-0.5">
            Función aplicada cuando varios registros caen en el mismo periodo para la misma entidad.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Modo de acumulación</label>
          <SelectControl
            value={value.accumulateMode ?? 'running'}
            onChange={(e) => update({accumulateMode: e.target.value as TimelineRaceConfig['accumulateMode']})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="running">Acumulado corriente (clásico)</option>
            <option value="period">Solo valor del periodo</option>
          </SelectControl>
          <p className="text-[10px] text-muted mt-0.5">
            "Acumulado corriente": cada paso suma al total previo. "Solo periodo": cada paso muestra únicamente el valor de ese rango.
          </p>
        </div>
      </Collapsible>

      <Collapsible title="Ranking">
        <div>
          <label className="text-sm font-medium mb-1 block">Máximo de entidades</label>
          <input
            type="number"
            min={0}
            max={50}
            value={value.maxRows ?? 0}
            onChange={(e) => update({maxRows: Number(e.target.value) || undefined})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <p className="text-[10px] text-muted mt-0.5">
            0 = sin límite. Limita la cantidad de entidades visibles en la carrera.
          </p>
        </div>
        <SliderNumberInput
          label="Duración de la carrera (s)"
          value={value.raceDurationSeconds ?? 0}
          min={0}
          max={60}
          step={1}
          onChange={(v) => update({raceDurationSeconds: v > 0 ? v : undefined})}
        />
        <p className="text-[10px] text-muted mt-0.5">
          Tiempo del barrido de la carrera. 0 = automático (la carrera ocupa todo el tiempo disponible). Al fijarla, el tiempo sobrante queda congelado en el resultado final.
        </p>
        <SwitchControl
          label="Efecto podio al final"
          checked={value.podiumEffect ?? true}
          onChange={(v) => update({podiumEffect: v})}
        />
        <p className="text-[10px] text-muted">
          Cuando se revela el ganador, lo agranda con brillo y atenúa a los que no quedaron primeros. Apagado = sin atenuación ni brillo.
        </p>
      </Collapsible>
            </>
          )}
          {activeTab === 'design' && (
            <>
      {/* ============ HEADER ============ */}
      <HeaderSection value={value} update={update} />

      {/* ============ COLORES ============ */}
      {participants.length > 0 && (
        <Collapsible title="Colores">
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-sm font-medium block">Colores por entidad</label>
            {Object.keys(value.barColors ?? {}).length > 0 && (
              <button type="button" onClick={() => update({barColors: undefined})} className="text-[10px] text-muted hover:text-red-500">
                Limpiar todos
              </button>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Paleta de colores</label>
            <PalettePicker selected={barPalette} onSelect={setBarPalette} onClear={() => setBarPalette(undefined)} />
          </div>
          <p className="text-[10px] text-muted">
            La paleta colorea cada entidad cíclicamente; un color manual por entidad tiene prioridad sobre ella.
          </p>
          <EntitySearch value={colorQ} onChange={setColorQ} shown={filteredColors.length} total={participants.length} />
          <div className="space-y-1.5">
            {filteredColors.map((p) => {
              const paletteColor = barPalette.length ? barPalette[(palIndex.get(p.label) ?? 0) % barPalette.length] : undefined;
              const color = value.barColors?.[p.label] ?? paletteColor ?? '#3f3f46';
              return (
                <div key={p.label} className="flex items-center gap-2">
                  <span className="w-12 h-8 shrink-0 rounded border border-border-default" style={{backgroundColor: paletteColor ?? 'transparent', boxShadow: value.barColors?.[p.label] ? `inset 0 0 0 2px ${color}` : 'none'}} />
                  <span className="sr-only">{paletteColor ? 'Color de paleta' : 'Color manual'}</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setBarColor(p.label, e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-border-default bg-transparent"
                    aria-label={`Color de ${p.label}`}
                  />
                  <span className="text-xs text-secondary truncate flex-1">{p.label}</span>
                  {value.barColors?.[p.label] && (
                    <button
                      onClick={() => setBarColor(p.label)}
                      className="text-muted hover:text-red-500 px-1 text-xs"
                      aria-label={`Restablecer color de ${p.label}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Collapsible>
      )}

      {/* ============ BARRAS ============ */}
      {participants.length > 0 && (
        <Collapsible title="Barras">
          <SliderNumberInput
            label="Ancho de las barras (%)"
            value={value.barWidth ? Math.round(value.barWidth * 100) : 75}
            min={40}
            max={95}
            step={5}
            onChange={(v) => update({barWidth: v ? v / 100 : undefined})}
          />
          <p className="text-[10px] text-muted mb-1">
            Reduce el porcentaje para dar más espacio al valor y al avatar (útil cuando el valor se sale de pantalla).
          </p>
          <NumberControl label="Radio de esquina de la barra (vacío = píldora)" value={value.barRadius} min={0} max={60} step={1} onChange={(v) => update({barRadius: v})} />
          <NumberControl label="Grosor de la barra (px, vacío = automático)" value={value.barThickness} min={4} max={120} step={2} onChange={(v) => update({barThickness: v})} />
          <div className="pt-2 mt-1 border-t border-border-subtle">
            <p className="text-[10px] text-muted mb-1.5">Posición del grupo de filas y eje X (offset en px desde su lugar por defecto).</p>
            <div className="grid grid-cols-2 gap-2">
              <NumberControl label="X (px)" value={value.barsX} step={4} onChange={(v) => update({barsX: v})} />
              <NumberControl label="Y (px)" value={value.barsY} step={4} onChange={(v) => update({barsY: v})} />
            </div>
          </div>
        </Collapsible>
      )}

      {/* ============ EJE X ============ */}
      <Collapsible title="Eje X" defaultOpen>
        <div>
          <label className="text-sm font-medium mb-1 block">Formato de fecha</label>
          <SelectControl
            value={fmt}
            onChange={(e) => update({dateFormat: e.target.value as DateFormat})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="day">Día</option>
            <option value="month">Mes</option>
            <option value="year">Año</option>
          </SelectControl>
          <p className="text-[10px] text-muted mt-0.5">
            Agrupa los datos por día, mes o año y re-agrega el valor acumulado en cada rango.
          </p>
        </div>
        <SwitchControl
          label="Mostrar eje X"
          checked={value.showXAxis ?? true}
          onChange={(v) => update({showXAxis: v})}
        />
        <div>
          <label className="text-sm font-medium mb-1 block">Posición del eje X</label>
          <div className="grid grid-cols-2 gap-1">
            {(['bottom', 'top'] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => update({axisPosition: pos})}
                className={`px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  (value.axisPosition ?? 'bottom') === pos
                    ? 'bg-amber-500 text-black'
                    : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
                }`}
              >
                {pos === 'bottom' ? 'Abajo' : 'Arriba'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Orden de la fila (izq → der)</label>
          <RowOrderControl value={value.rowOrder ?? ['bar', 'avatar']} onChange={setRowOrder} />
        </div>
        <SliderNumberInput label="Separación vertical entre filas (px)" value={value.rowGap ?? 0} min={0} max={120} step={2} onChange={(v) => update({rowGap: v || undefined})} />
        <SliderNumberInput label="Separación horizontal (px)" value={value.rowGapH ?? 0} min={0} max={80} step={2} onChange={(v) => update({rowGapH: v || undefined})} />
        <SelectControl
          label="Formato del valor acumulado"
          value={value.valueFormat ?? 'number'}
          options={VALUE_FORMATS}
          onChange={(e) => update({valueFormat: e.target.value as ValueFormat})}
        />
        {(value.valueFormat ?? 'number') === 'currency' && (
          <div>
            <label className="text-sm font-medium mb-1 block">Símbolo de moneda</label>
            <input
              value={value.currencySymbol ?? '$'}
              onChange={(e) => update({currencySymbol: e.target.value || undefined})}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}
        <p className="text-[10px] text-muted">
          El eje X muestra el valor acumulado (mínimo 0 y máximo), no las fechas. La fecha en pantalla se muestra abajo a la derecha como texto e indica el momento del recorrido.
        </p>
      </Collapsible>

      {/* ============ EJE Y ============ */}
      <Collapsible title="Eje Y">
        <SwitchControl
          label="Eje vertical (Y)"
          checked={value.showYAxis ?? false}
          onChange={(v) => update({showYAxis: v || undefined})}
        />
        <ColorPickerControl label="Color del eje" value={value.yAxisColor ?? '#334155'} onChange={(v) => update({yAxisColor: v || undefined})} />
        <SliderNumberInput label="Grosor del eje (px)" value={value.yAxisWidth ?? 2} min={1} max={12} step={1} onChange={(v) => update({yAxisWidth: v || undefined})} />
        <p className="text-[10px] text-muted">
          Línea vertical en el origen (borde izquierdo) de las barras.
        </p>
      </Collapsible>

      {/* ============ FECHA ============ */}
      <Collapsible title="Fecha">
        <SwitchControl
          label="Mostrar fecha en pantalla"
          checked={value.showDateLabel ?? true}
          onChange={(v) => update({showDateLabel: v})}
        />
        <div className="pt-2 mt-1 border-t border-border-subtle">
          <p className="text-[10px] text-muted mb-1.5">Posición de la fecha (offset en px desde la esquina inferior derecha).</p>
          <div className="grid grid-cols-2 gap-2">
            <NumberControl label="X (px)" value={value.dateX} step={4} onChange={(v) => update({dateX: v})} />
            <NumberControl label="Y (px)" value={value.dateY} step={4} onChange={(v) => update({dateY: v})} />
          </div>
        </div>
        <div className="pt-2 mt-1 border-t border-border-subtle">
          <TextStyleControls label="Texto de la fecha" value={value.dateText} onChange={(patch) => update({dateText: {...(value.dateText ?? {}), ...patch}})}  showTextTransform showSpacing showHighlight showUnderline maxSize={160}/>
        </div>
      </Collapsible>

      {/* ============ ETIQUETAS ============ */}
      <Collapsible title="Etiquetas">
        <TextStyleControls label="Texto de la etiqueta" value={value.labelText} onChange={(patch) => update({labelText: {...(value.labelText ?? {}), ...patch}})}  showTextTransform showSpacing showHighlight showUnderline maxSize={160}/>
        <p className="text-[10px] text-muted mt-0.5">
          El nombre de la entidad que se apoya sobre la barra en el outro final.
        </p>
        <div className="h-px bg-border-default my-3" />
        <TextStyleControls label="Texto del dato (dentro de la barra)" value={value.valueText} onChange={(patch) => update({valueText: {...(value.valueText ?? {}), ...patch}})}  showTextTransform showSpacing showHighlight showUnderline maxSize={160}/>
        <p className="text-[10px] text-muted mt-0.5">
          El valor acumulado que viaja dentro de cada barra.
        </p>
      </Collapsible>

      {/* ============ LIENZO ============ */}
      <CanvasSection value={value} update={update} />

      {/* ============ AVATAR ============ */}
      <AvatarSection value={value} onChange={update} participants={participants} withBarColor />

      {/* ============ ADICIONALES ============ */}
      <OverlaysSection value={value} update={update} />
            </>
          )}
        </div>
      )}
    </Tabs>
  );
}

// Race Scrolling config UI: same header/cols/avatar/bars/canvas as the
// timeline race, plus the scrolling "Eje" section (camera anchor + ticks) and
// the "Marcadores del eje" section (per-entity markers pinned to each date grid
// of the band).
type RaceScrollingPanelProps = Omit<AnimationConfigPanelProps, 'value' | 'onChange'> & {
  value: RaceScrollingConfig;
  onChange: (next: RaceScrollingConfig) => void;
};

function RaceScrollingPanel({templateId, columns, fieldMeta, value, onChange, participants = [], templateSelector}: RaceScrollingPanelProps) {
  const update = (patch: Partial<RaceScrollingConfig>) => onChange({...value, ...patch});
  const [entityFilterQ, setEntityFilterQ] = useState('');
  const filteredEntities = () =>
    entityFilterQ.trim() === ''
      ? participants
      : participants.filter((p) => norm(p.label).includes(norm(entityFilterQ.trim())));
  const toggleEntity = (label: string, on: boolean) => {
    const cur = new Set(value.entityFilter ?? []);
    if (on) cur.add(label);
    else cur.delete(label);
    update({entityFilter: cur.size > 0 ? Array.from(cur).sort() : undefined});
  };
  const setEntitySelection = (mode: Exclude<RaceScrollingConfig['entitySelection'], undefined>) => {
    update({entitySelection: mode});
  };
  const fmt = (value.dateFormat ?? 'day') as DateFormat;
  const setBarColor = (label: string, color?: string) => {
    const next = {...(value.barColors ?? {})};
    if (color) next[label] = color;
    else delete next[label];
    update({barColors: next});
  };

  const [colorQ, setColorQ] = useState('');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matchQ = (label: string, q: string) => (q.trim() === '' ? true : norm(label).includes(norm(q)));
  const filteredColors = participants.filter((p) => matchQ(p.label, colorQ));
  const barPalette = value.barPalette ?? [];
  const palIndex = new Map(participants.map((p, i) => [p.label, i]));
  const setBarPalette = (colors?: string[]) => update({barPalette: colors});

  const markerMode = value.markerMode ?? 'number';

  return (
    <Tabs
      tabs={[{ id: 'data', label: 'Datos' }, { id: 'design', label: 'Diseño' }]}
      className="h-full"
    >
      {(activeTab) => (
        <div className="space-y-4 pb-12">
          {activeTab === 'data' && (
            <>
              {templateSelector}

              <Collapsible title="Datos" defaultOpen>
        <FieldSelect
          label="Entidad / etiqueta"
          value={value.labelField ?? ''}
          options={fieldMeta}
          fallback={columns}
          onChange={(v) => update({labelField: v || undefined})}
        />
        <FieldSelect
          label="Imagen de la entidad (opcional)"
          value={value.imageField ?? ''}
          options={fieldMeta}
          fallback={columns}
          role="any"
          optional
          onChange={(v) => update({imageField: v || undefined})}
        />
        <FieldSelect
          label="Eje de la carrera (cardinalidad)"
          value={value.axisField ?? value.dateField ?? ''}
          options={fieldMeta}
          fallback={columns}
          role="any"
          onChange={(v) => update({axisField: v || undefined})}
        />
        <p className="text-[10px] text-muted -mt-1">
          Columna que recorre la carrera: puede ser de fechas o de números (años, rondas, días...). El tipo de eje se detecta automáticamente. Si no hay columna usable, se muestra el modo paralelo.
        </p>
        <div>
          <label className="text-sm font-medium mb-1 block">Presentación del eje</label>
          <div className="grid grid-cols-2 gap-1">
            {(['asc', 'desc'] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => update({axisDirection: dir})}
                className={`px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  (value.axisDirection ?? 'asc') === dir
                    ? 'bg-amber-500 text-black'
                    : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
                }`}
              >
                {dir === 'asc' ? 'Menor → Mayor' : 'Mayor → Menor'}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted mt-0.5">
            Invierte el sentido del recorrido: la carrera avanza de mayor a menor, o de menor a mayor.
          </p>
        </div>
        <FieldSelect
          label="Campo de valor acumulado"
          value={value.valueField ?? ''}
          options={fieldMeta}
          fallback={columns}
          role="numeric"
          onChange={(v) => update({valueField: v || undefined})}
        />
        <div>
          <label className="text-sm font-medium mb-1 block">Agregación por periodo</label>
          <SelectControl
            value={value.valueAgg ?? 'sum'}
            onChange={(e) => update({valueAgg: e.target.value as RaceScrollingConfig['valueAgg']})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="sum">Suma</option>
            <option value="count">Conteo</option>
            <option value="avg">Promedio</option>
            <option value="min">Mínimo</option>
            <option value="max">Máximo</option>
            <option value="last">Último valor</option>
          </SelectControl>
          <p className="text-[10px] text-muted mt-0.5">
            Función aplicada cuando varios registros caen en el mismo periodo para la misma entidad.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Modo de acumulación</label>
          <SelectControl
            value={value.accumulateMode ?? 'running'}
            onChange={(e) => update({accumulateMode: e.target.value as RaceScrollingConfig['accumulateMode']})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="running">Acumulado corriente (clásico)</option>
            <option value="period">Solo valor del periodo</option>
          </SelectControl>
          <p className="text-[10px] text-muted mt-0.5">
            "Acumulado corriente": cada paso suma al total previo. "Solo periodo": cada paso muestra únicamente el valor de ese rango.
          </p>
        </div>
      </Collapsible>

      <Collapsible title="Ranking">
        <div>
          <p className="text-[10px] text-muted mb-1.5">
            Decide si la carrera trunca las entidades al Top N o muestra todas (libertad).
          </p>
          <SwitchControl
            label="Limitar a Top N"
            checked={(value.maxRows ?? 0) > 0}
            onChange={(on) => update(on ? {maxRows: value.maxRows && value.maxRows > 0 ? value.maxRows : 10} : {maxRows: undefined})}
          />
          {(value.maxRows ?? 0) > 0 && (
            <div className="mt-2">
              <label className="text-sm font-medium mb-1 block">Cantidad N</label>
              <input
                type="number"
                min={1}
                max={50}
                value={value.maxRows ?? 10}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  update({maxRows: n > 0 ? Math.min(50, Math.max(1, n)) : undefined});
                }}
                className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          )}
          <p className="text-[10px] text-muted mt-0.5">
            Apagado = corren TODAS las entidades. Encendido = solo las N mejores según la "Selección de entidades" de abajo (mayor/menor valor final acumulado).
          </p>
        </div>
        <div className="pt-2 mt-1 border-t border-border-subtle">
          <SliderNumberInput
            label="Máximo de filas en pantalla"
            value={value.maxVisibleRows ?? 0}
            min={0}
            max={50}
            step={1}
            onChange={(v) => update({maxVisibleRows: v || undefined})}
          />
          <p className="text-[10px] text-muted mt-0.5">
            Cuántas filas muestra el plot A LA VEZ (la altura del plot siempre cabe). En 0 (por defecto) sin tope: se ven tantas como entidades corran. Ajustado, las de menor rango quedan FUERA de pantalla y entran al cambiar los valores con "Reordenar filas según valor" encendido.
          </p>
        </div>
        <div className="pt-2 mt-1 border-t border-border-subtle">
          <SwitchControl
            label="Reordenar filas según valor (temporizado)"
            checked={value.reorderByValue ?? false}
            onChange={(v) => update({reorderByValue: v || undefined})}
          />
          <p className="text-[10px] text-muted mt-0.5">
            Encendido: los carriles cambian de puesto según el valor acumulado en cada momento de la cinta (race-chart clásico, con intercambios animados). Apagado: orden estático fijo.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Selección de entidades</label>
          <SelectControl
            value={value.entitySelection ?? 'final-value'}
            onChange={(e) => setEntitySelection(e.target.value as Exclude<RaceScrollingConfig['entitySelection'], undefined>)}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="final-value">Mayor / menor valor final acumulado</option>
            <option value="manual">Filtro manual (elijo las unidades)</option>
          </SelectControl>
          <p className="text-[10px] text-muted mt-0.5">
            "Mayor / menor": el máximo se trunca según el valor acumulado al final de la línea de tiempo (no por el puesto durante la carrera). "Manual": corren solo las entidades que elijas.
          </p>
        </div>
        {(value.entitySelection ?? 'final-value') === 'final-value' ? (
          <div>
            <label className="text-sm font-medium mb-1 block">Qué extremo conservar</label>
            <SelectControl
              value={value.finalValueDirection ?? 'top'}
              onChange={(e) => update({finalValueDirection: e.target.value as RaceScrollingConfig['finalValueDirection']})}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="top">Mayor acumulado final (top N)</option>
              <option value="bottom">Menor acumulado final (bottom N)</option>
            </SelectControl>
            <p className="text-[10px] text-muted mt-0.5">
              Se mantienen las N entidades con el valor más alto o más bajo al final, sin importar su posición durante la carrera.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium block">Unidades a mostrar</label>
              {(value.entityFilter?.length ?? 0) > 0 && (
                <button type="button" onClick={() => update({entityFilter: undefined})} className="text-[10px] text-muted hover:text-red-500">
                  Limpiar ({value.entityFilter?.length})
                </button>
              )}
            </div>
            <EntitySearch value={entityFilterQ} onChange={setEntityFilterQ} shown={filteredEntities().length} total={participants.length} />
            <div className="max-h-44 overflow-y-auto mt-1 border border-border-subtle rounded-lg p-1">
              {filteredEntities().length === 0 && (
                <p className="text-[10px] text-muted p-1.5">Sin coincidencias.</p>
              )}
              {filteredEntities().map((p) => {
                const on = (value.entityFilter ?? []).includes(p.label);
                return (
                  <label key={p.label} className={`flex items-center gap-2 px-1.5 py-1 rounded cursor-pointer ${on ? 'bg-elevated' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => toggleEntity(p.label, e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span className="text-xs text-secondary truncate" title={p.label}>{p.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[10px] text-muted mt-0.5">
              Solo estas entidades corren (ignora el máximo). Sin ninguna selección = todas.
            </p>
          </div>
        )}
        <SliderNumberInput
          label="Pausa final (s)"
          value={value.holdFinalSeconds ?? 2}
          min={0}
          max={10}
          step={0.5}
          onChange={(v) => update({holdFinalSeconds: v >= 0 ? v : undefined})}
        />
        <p className="text-[10px] text-muted mt-0.5">
          El scroll viaja a velocidad constante; al llegar a la última fecha (que se desplaza un poco más allá del eje), la cinta se congela estos segundos antes del fade de salida. A mayor pausa, más rápido se desplaza la cinta para ocupar el resto del tiempo.
        </p>
        <SwitchControl
          label="Efecto podio al final"
          checked={value.podiumEffect ?? true}
          onChange={(v) => update({podiumEffect: v})}
        />
        <p className="text-[10px] text-muted">
          Cuando se revela el ganador, lo agranda con brillo y atenúa a los que no quedaron primeros. Apagado = sin atenuación ni brillo.
        </p>
      </Collapsible>
            </>
          )}
          {activeTab === 'design' && (
            <>
      {/* ============ HEADER ============ */}
      <HeaderSection value={value} update={update} />

      {/* ============ COLORES ============ */}
      {participants.length > 0 && (
        <Collapsible title="Colores">
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-sm font-medium block">Colores por entidad</label>
            {Object.keys(value.barColors ?? {}).length > 0 && (
              <button type="button" onClick={() => update({barColors: undefined})} className="text-[10px] text-muted hover:text-red-500">
                Limpiar todos
              </button>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Paleta de colores</label>
            <PalettePicker selected={barPalette} onSelect={setBarPalette} onClear={() => setBarPalette(undefined)} />
          </div>
          <p className="text-[10px] text-muted">
            La paleta colorea cada entidad cíclicamente; un color manual por entidad tiene prioridad sobre ella.
          </p>
          <EntitySearch value={colorQ} onChange={setColorQ} shown={filteredColors.length} total={participants.length} />
          <div className="space-y-1.5">
            {filteredColors.map((p) => {
              const paletteColor = barPalette.length ? barPalette[(palIndex.get(p.label) ?? 0) % barPalette.length] : undefined;
              const color = value.barColors?.[p.label] ?? paletteColor ?? '#3f3f46';
              return (
                <div key={p.label} className="flex items-center gap-2">
                  <span className="w-12 h-8 shrink-0 rounded border border-border-default" style={{backgroundColor: paletteColor ?? 'transparent', boxShadow: value.barColors?.[p.label] ? `inset 0 0 0 2px ${color}` : 'none'}} />
                  <span className="sr-only">{paletteColor ? 'Color de paleta' : 'Color manual'}</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setBarColor(p.label, e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-border-default bg-transparent"
                    aria-label={`Color de ${p.label}`}
                  />
                  <span className="text-xs text-secondary truncate flex-1">{p.label}</span>
                  {value.barColors?.[p.label] && (
                    <button
                      onClick={() => setBarColor(p.label)}
                      className="text-muted hover:text-red-500 px-1 text-xs"
                      aria-label={`Restablecer color de ${p.label}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Collapsible>
      )}

      {/* ============ BARRAS ============ */}
      {participants.length > 0 && (
        <Collapsible title="Barras">
          <SliderNumberInput
            label="Ancho de las barras (%)"
            value={value.barWidth ? Math.round(value.barWidth * 100) : 75}
            min={40}
            max={95}
            step={5}
            onChange={(v) => update({barWidth: v ? v / 100 : undefined})}
          />
          <p className="text-[10px] text-muted mb-1">
            Reduce el porcentaje para dar más espacio al valor y al avatar (útil cuando el valor se sale de pantalla).
          </p>
          <NumberControl label="Radio de esquina de la barra (vacío = píldora)" value={value.barRadius} min={0} max={60} step={1} onChange={(v) => update({barRadius: v})} />
          <NumberControl label="Grosor de la barra (px, vacío = automático)" value={value.barThickness} min={4} max={120} step={2} onChange={(v) => update({barThickness: v})} />
          <SliderNumberInput label="Separación vertical entre filas (px)" value={value.rowGap ?? 0} min={0} max={120} step={2} onChange={(v) => update({rowGap: v || undefined})} />
          <p className="text-[10px] text-muted mt-0.5 mb-1">
            También define el inicio y fin del plot: el eje Y y las gridlines de fecha abarcan el bloque de filas (incluidos los huecos) más un padding proporcional.
          </p>
          <SliderNumberInput label="Separación horizontal (px)" value={value.rowGapH ?? 0} min={0} max={80} step={2} onChange={(v) => update({rowGapH: v || undefined})} />
          <div className="pt-2 mt-1 border-t border-border-subtle">
            <p className="text-[10px] text-muted mb-1.5">Posición del grupo de filas y del eje (offset en px desde su lugar por defecto). Mueve juntos las barras, los avatares y las etiquetas, el eje Y permanente, las gridlines de fecha y la línea de "ahora".</p>
            <div className="grid grid-cols-2 gap-2">
              <NumberControl label="X (px)" value={value.barsX} step={4} onChange={(v) => update({barsX: v})} />
              <NumberControl label="Y (px)" value={value.barsY} step={4} onChange={(v) => update({barsY: v})} />
            </div>
          </div>
        </Collapsible>
      )}

      {/* ============ GRIDLINE ============ */}
      <Collapsible title="Gridline" defaultOpen>
        <div>
          <label className="text-sm font-medium mb-1 block">Formato de fecha</label>
          <SelectControl
            value={fmt}
            onChange={(e) => update({dateFormat: e.target.value as DateFormat})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="day">Día</option>
            <option value="month">Mes</option>
            <option value="year">Año</option>
          </SelectControl>
          <p className="text-[10px] text-muted mt-0.5">
            Agrupa los datos por día, mes o año y re-agrega el valor acumulado en cada rango.
          </p>
        </div>
        <SwitchControl
          label="Mostrar gridlines de fechas"
          checked={value.showXAxis ?? true}
          onChange={(v) => update({showXAxis: v})}
        />
        <SliderNumberInput
          label="Separación entre gridlines (px)"
          value={value.gridSpacing ?? 0}
          min={0}
          max={320}
          step={5}
          onChange={(v) => update({gridSpacing: v || undefined})}
        />
        <p className="text-[10px] text-muted mt-0.5">
          TODAS las fechas reales dibujan su gridline vertical con su etiqueta justo encima — nunca se omite ninguna. En 0 (por defecto) cada una queda en su posición real según su valor acumulado; al subir el valor las gridlines se separan EXACTAMENTE ese px (fechas equidistantes, todas visibles) y las que queden fuera del lienzo se arrastran de vuelta por la cinta. Esta nace en el eje Y permanente — justo en el borde derecho del avatar, donde la barra queda 12px por DETRÁS del avatar — y, con espaciado uniforme, la primera fecha entra tras UN solo hueco de separación (misma cadencia que el resto). Al hacer scroll, cada gridline Y SU ETIQUETA se ocultan exactamente en la posición del eje Y. Solo el eje de fechas se desplaza.
        </p>
        <div className="pt-2 mt-1 border-t border-border-subtle">
          <p className="text-[10px] text-muted mb-1.5">Apariencia de las gridlines (intervalos verticales de fecha).</p>
          <SelectControl
            label="Estilo de gridlines"
            value={value.gridlineStyle ?? 'dotted'}
            onChange={(e) => update({gridlineStyle: (e.target.value as RaceScrollingConfig['gridlineStyle']) || undefined})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="dotted">Punteado</option>
            <option value="dashed">Guiones</option>
            <option value="solid">Línea continua</option>
          </SelectControl>
          <ColorPickerControl label="Color de gridlines" value={value.gridlineColor ?? '#334155'} onChange={(v) => update({gridlineColor: v || undefined})} />
          <SliderNumberInput label="Grosor de gridlines (px)" value={value.gridlineWidth ?? 1} min={1} max={8} step={1} onChange={(v) => update({gridlineWidth: v || undefined})} />
          <SliderNumberInput label="Opacidad de gridlines (%)" value={Math.round((value.gridlineOpacity ?? 0.35) * 100)} min={0} max={100} step={5} onChange={(v) => update({gridlineOpacity: v === 0 ? 0 : (v || 35) / 100})} />
        </div>
        <SelectControl
          label="Formato del valor acumulado"
          value={value.valueFormat ?? 'number'}
          options={VALUE_FORMATS}
          onChange={(e) => update({valueFormat: e.target.value as ValueFormat})}
        />
        {(value.valueFormat ?? 'number') === 'currency' && (
          <div>
            <label className="text-sm font-medium mb-1 block">Símbolo de moneda</label>
            <input
              value={value.currencySymbol ?? '$'}
              onChange={(e) => update({currencySymbol: e.target.value || undefined})}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}
        <p className="text-[10px] text-muted">
          El plot es la caja que delimita los ejes: cada fecha real de "campo fecha" (o valor del eje numérico) dibuja su gridline con su etiqueta justo encima — nunca se omite ninguna —; la cinta se desliza y se recorta al cruzar los límites del plot. El eje Y es la línea permanente en el borde derecho del avatar (escala implícita 0 → máximo acumulado global), el origen desde el que crecen las barras —las barras van 12px por DETRÁS del avatar, y solo aumentan cuando un marcador del eje cruza la línea Y (salto con mini-ease, plano entre fechas)—; con espaciado uniforme de gridlines la primera fecha entra tras un solo hueco de separación. Las gridlines y sus etiquetas se ocultan justo al llegar a esa línea durante el scroll. Las marcas por entidad desaparecen al sobrepasar los límites. La fecha en pantalla se muestra abajo a la derecha.
        </p>
      </Collapsible>

      {/* ============ MARCADORES DEL EJE ============ */}
      <Collapsible title="Marcadores del eje">
        <SwitchControl
          label="Marcadores por entidad"
          checked={value.showMarkers ?? true}
          onChange={(v) => update({showMarkers: v})}
        />
        <p className="text-[10px] text-muted mt-0.5">
          Cada grid de fecha ("caja eje") muestra el marcador de cada entidad cuyo acumulado cambia en esa fecha, colocado sobre la gridline a la altura de su fila. En modo número muestra el delta: valor acumulado en esa fecha − valor acumulado en la fecha anterior (lo que la fecha aporta al acumulado, no el total); si ese delta es 0, el marcador no se visualiza. En ícono/imagen de referencia el delta se apila horizontalmente (tope 6 + chip «+N»). Viaja con la cinta y desaparece al cruzar los límites del plot.
        </p>
        <div className="mt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Modo del marcador</label>
              <SelectControl
                value={markerMode}
                onChange={(e) => update({markerMode: e.target.value as RaceScrollingConfig['markerMode']})}
                className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="number">Número</option>
                <option value="icon">Ícono</option>
                <option value="image">Imagen de referencia</option>
              </SelectControl>
            </div>
            {markerMode === 'icon' && (
              <div>
                <label className="text-sm font-medium mb-1 block">Ícono (tintado con el color de la barra)</label>
                <div className="grid grid-cols-7 gap-1">
                  {ICON_GLYPH_NAMES.map((name) => (
                    <button
                      key={name}
                      onClick={() => update({markerIcon: name})}
                      title={name}
                      className={`p-1.5 rounded flex items-center justify-center transition-colors ${
                        (value.markerIcon ?? 'star') === name ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18">
                        <path d={ICON_GLYPHS[name]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted mt-1">
                  Los íconos se repiten en fila según el delta de la fecha, tintados con el color de la barra de la entidad.
                </p>
              </div>
            )}
            {markerMode === 'image' && (
              <>
                <p className="text-[10px] text-muted mt-1">
                  Si cargas un campo (url) de referencia, cada marcador usa ESA imagen por entidad; si una entidad no tiene valor en el campo, se reutiliza «Imagen de la entidad». Sin ninguna, se muestra su número.
                </p>
                <FieldSelect
                  label="Imagen de referencia (campo url)"
                  value={value.markerImageField ?? ''}
                  options={fieldMeta}
                  fallback={columns}
                  role="any"
                  optional
                  onChange={(v) => update({markerImageField: v || undefined})}
                />
                <p className="text-[10px] text-muted -mt-1">
                  Columna del modelo con la URL (o data-URI) de la imagen de referencia para el marcador, por entidad.
                </p>
              </>
            )}
            {markerMode !== 'number' && (
              <p className="text-[10px] text-muted mt-1">
                En modo ícono e imagen de referencia, el marcador apila HORIZONTALMENTE tantos glifos como unidades aporta esa fecha (el delta): delta=3 → 3 en fila, con tope de 6 y un chip «+N» para el excedente.
              </p>
            )}
            <div className="pt-2 mt-1 border-t border-border-subtle">
              <AudioUploadInput
                label="Sonido al aumentar la barra (por fecha)"
                value={value.barSoundSrc}
                onLoad={(v) => update({barSoundSrc: v})}
                onClear={() => update({barSoundSrc: undefined})}
              />
              <p className="text-[10px] text-muted mt-0.5">
                Suena UNA vez cada vez que un grid de fecha cruza el eje Y y al menos una barra crece (el mismo disparo que los marcadores). Se exporta en el video.
              </p>
            </div>
            <NumberControl label="Tamaño del marcador (px)" value={value.markerSize} min={12} max={120} step={2} onChange={(v) => update({markerSize: v})} />
            {markerMode === 'number' && (
              <div className="pt-2 mt-1 border-t border-border-subtle">
                <TextStyleControls label="Texto del marcador" value={value.markerText} onChange={(patch) => update({markerText: {...(value.markerText ?? {}), ...patch}})} showTextTransform showSpacing showHighlight showUnderline maxSize={80} />
              </div>
            )}
          </div>
      </Collapsible>

      {/* ============ EJE Y ============ */}
      <Collapsible title="Eje Y">
        <ColorPickerControl label="Color del eje" value={value.yAxisColor ?? '#334155'} onChange={(v) => update({yAxisColor: v || undefined})} />
        <SliderNumberInput label="Grosor del eje (px)" value={value.yAxisWidth ?? 2} min={1} max={12} step={1} onChange={(v) => update({yAxisWidth: v || undefined})} />
        <p className="text-[10px] text-muted">
          Eje Y permanente a la derecha del avatar (con el mínimo padding del hueco horizontal): una sola línea vertical en el origen del carril de barras (escala implícita 0 → máximo acumulado), desde la que crecen las barras. Su grosor y color definen el origen del scrolling de las fechas.
        </p>
      </Collapsible>

      {/* ============ FECHA ============ */}
      <Collapsible title="Fecha">
        <SwitchControl
          label="Mostrar fecha en pantalla"
          checked={value.showDateLabel ?? true}
          onChange={(v) => update({showDateLabel: v})}
        />
        <div className="pt-2 mt-1 border-t border-border-subtle">
          <p className="text-[10px] text-muted mb-1.5">Posición de la fecha (offset en px desde la esquina inferior derecha).</p>
          <div className="grid grid-cols-2 gap-2">
            <NumberControl label="X (px)" value={value.dateX} step={4} onChange={(v) => update({dateX: v})} />
            <NumberControl label="Y (px)" value={value.dateY} step={4} onChange={(v) => update({dateY: v})} />
          </div>
        </div>
        <div className="pt-2 mt-1 border-t border-border-subtle">
          <TextStyleControls label="Texto de la fecha" value={value.dateText} onChange={(patch) => update({dateText: {...(value.dateText ?? {}), ...patch}})}  showTextTransform showSpacing showHighlight showUnderline maxSize={160}/>
        </div>
      </Collapsible>

      {/* ============ ETIQUETAS ============ */}
      <Collapsible title="Etiquetas">
        <SwitchControl
          label="Mostrar etiqueta de la entidad"
          checked={value.showLabels ?? true}
          onChange={(v) => update({showLabels: v})}
        />
        <p className="text-[10px] text-muted mt-0.5">
          El nombre de la entidad en el eje fijo de la izquierda. Al ocultarlo la columna se colapsa y el plot/banda de barras se expande hacia la izquierda.
        </p>
        <TextStyleControls label="Texto de la etiqueta" value={value.labelText} onChange={(patch) => update({labelText: {...(value.labelText ?? {}), ...patch}})}  showTextTransform showSpacing showHighlight showUnderline maxSize={160}/>
        <p className="text-[10px] text-muted mt-0.5">
          El nombre de la entidad en el eje fijo de la izquierda.
        </p>
        <div className="h-px bg-border-default my-3" />
        <TextStyleControls label="Texto del dato (dentro de la barra)" value={value.valueText} onChange={(patch) => update({valueText: {...(value.valueText ?? {}), ...patch}})}  showTextTransform showSpacing showHighlight showUnderline maxSize={160}/>
        <p className="text-[10px] text-muted mt-0.5">
          El valor acumulado que viaja dentro de cada barra.
        </p>
      </Collapsible>

      {/* ============ LIENZO ============ */}
      <CanvasSection value={value} update={update} />

      {/* ============ AVATAR ============ */}
      <AvatarSection
        value={value}
        onChange={update}
        participants={participants}
        withBarColor
        extra={
          <div className="mt-1">
            <SelectControl
              label="Entrada inicial"
              value={value.avatarEntry ?? 'top'}
              onChange={(e) => update({avatarEntry: (e.target.value as RaceScrollingConfig['avatarEntry']) || undefined})}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="top">Desde arriba (caen)</option>
              <option value="left">Desde la izquierda (desde los nombres)</option>
              <option value="bottom">Desde abajo (suben)</option>
              <option value="none">Sin entrada</option>
            </SelectControl>
            {(value.avatarEntry ?? 'top') !== 'none' && (
              <>
                <SelectControl
                  label="Cuándo"
                  value={value.avatarEntryTiming ?? 'start'}
                  onChange={(e) => update({avatarEntryTiming: (e.target.value as RaceScrollingConfig['avatarEntryTiming']) || undefined})}
                  className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="start">Al iniciar la cinta (escalonada por fila)</option>
                  <option value="first-data">Cuando aparece su primer dato</option>
                </SelectControl>
              </>
            )}
            <p className="text-[10px] text-muted mt-0.5">
              {value.avatarEntry && value.avatarEntry !== 'none' && value.avatarEntryTiming === 'first-data'
                ? 'Cada avatar entra cuando su primer dato cruza el eje (a la vez que su barra). "Al iniciar la cinta" los desliza escalonados por fila, una sola vez.'
                : value.avatarEntry && value.avatarEntry !== 'none'
                  ? 'Al iniciar la cinta, los avatares se deslizan y aparecen escalonados por fila (una sola vez).'
                  : '"Sin entrada" los muestra estáticos como antes.'}
            </p>
          </div>
        }
      />

      {/* ============ ADICIONALES ============ */}
      <OverlaysSection value={value} update={update} />
            </>
          )}
        </div>
      )}
    </Tabs>
  );
}

let animOverlayIdCounter = 0;
function newAnimOverlayId(): string {
  return `ov-${Date.now()}-${++animOverlayIdCounter}`;
}

// Additional overlays (text/image elements superimposed over the canvas)
function OverlaysSection<T extends {overlays?: import('@/lib/chart-config').ChartOverlay[]}>({
  value,
  update,
}: {
  value: T;
  update: (patch: Partial<T>) => void;
}) {
  const overlays = value.overlays ?? [];
  const setOverlay = (i: number, patch: Partial<import('@/lib/chart-config').ChartOverlay>) => {
    const next = [...overlays];
    next[i] = {...next[i], ...patch};
    update({overlays: next} as unknown as Partial<T>);
  };
  return (
    <Collapsible title="Adicionales">
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() =>
            update({
              overlays: [...overlays, {id: newAnimOverlayId(), type: 'text', text: 'Texto', layout: {x: 20, y: 20}}],
            } as unknown as Partial<T>)
          }
          className="px-2 py-1.5 rounded text-xs font-medium transition-colors bg-elevated text-secondary hover:bg-card-hover text-center"
        >
          + Texto
        </button>
        <button
          type="button"
          onClick={() =>
            update({
              overlays: [...overlays, {id: newAnimOverlayId(), type: 'image', x: 20, y: 20, width: 80, height: 80}],
            } as unknown as Partial<T>)
          }
          className="px-2 py-1.5 rounded text-xs font-medium transition-colors bg-elevated text-secondary hover:bg-card-hover text-center"
        >
          + Imagen
        </button>
        <button
          type="button"
          onClick={() =>
            update({
              overlays: [...overlays, {id: newAnimOverlayId(), type: 'shape', shape: 'rect', fill: '#f59e0b', x: 20, y: 20, width: 80, height: 80}],
            } as unknown as Partial<T>)
          }
          className="px-2 py-1.5 rounded text-xs font-medium transition-colors bg-elevated text-secondary hover:bg-card-hover text-center"
        >
          + Forma
        </button>
      </div>
      {overlays.length === 0 && (
        <p className="text-[10px] text-muted">
          Capas libres sobre el lienzo (formas, imágenes o textos) con control de opacidad, desenfoque y orden (frente/detrás).
        </p>
      )}
      {overlays.map((ov, i) => (
        <OverlayEditor
          key={ov.id}
          overlay={ov}
          index={i}
          variant="animation"
          onPatch={(patch) => setOverlay(i, patch)}
          onRemove={() => {
            const next = [...overlays];
            next.splice(i, 1);
            update({overlays: next} as unknown as Partial<T>);
          }}
        />
      ))}
    </Collapsible>
  );
}

// Large per-position image (manual: file upload or pasted URL) for the Ranking
// template. Rendered alongside the small avatar, not replacing it. Per-entity
// zoom/focus crop + global size, canvas offset and one-way pan toggle.
function RowImageSection({value, onChange, participants = []}: {
  value: RankingConfig;
  onChange: (patch: Partial<RankingConfig>) => void;
  participants?: Participant[];
}) {
  const [q, setQ] = useState('');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matchQ = (label: string, query: string) => (query.trim() === '' ? true : norm(label).includes(norm(query)));
  const filtered = participants.filter((p) => matchQ(p.label, q));
  const setImage = (label: string, src?: string) => {
    const next = {...(value.rowImages ?? {})};
    if (src && src.trim() !== '') next[label] = src.trim();
    else delete next[label];
    onChange({rowImages: next});
  };
  const setCrop = (label: string, patch?: Partial<AvatarCrop>) => {
    const next = {...(value.rowImageCrops ?? {})};
    if (patch) next[label] = {...(next[label] ?? {}), ...patch};
    else delete next[label];
    onChange({rowImageCrops: next});
  };
  const setImageMode = (label: string, mode: 'entity' | 'url' | 'file') => {
    const next = {...(value.rowImageModes ?? {})};
    next[label] = mode;
    onChange({rowImageModes: next});
  };
  const setPanDir = (label: string, dir?: 'ltr' | 'rtl') => {
    const next = {...(value.rowImagePanDirs ?? {})};
    if (dir) next[label] = dir; else delete next[label];
    onChange({rowImagePanDirs: next});
  };
  const imageRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  return (
    <Collapsible title="Imagen por puesto">
      <p className="text-[10px] text-muted">
        Marco global en el costado derecho del canvas: las filas se comprimen a la izquierda y el marco muestra la imagen del puesto que se está revelando, con corte directo (sin fundido) y un traslado lento (dirección configurable por imagen) hasta que entra el siguiente puesto. El zoom se aplica tal cual (valores menores a 1 alejan la imagen dentro del marco); si lo dejas en blanco, se usa un mínimo por defecto para que el foco y el traslado siempre tengan margen. El ancho no tiene tope: puede extenderse hasta todo el ancho del canvas (las filas se comprimen al mínimo).
      </p>
      <p className="text-[10px] text-amber-400/80">
        Solo se listan y muestran las {participants.length} entidades definidas por "Máximo de entidades" en Ranking (el top-N por valor). Las imágenes que configures para entidades fuera de ese top-N quedan guardadas y se reactivan si subes el límite.
      </p>
      <div>
        <label className="text-sm font-medium mb-1 block">Ancho del marco (vacío = automático)</label>
        <input
          type="number"
          min={16}
          max={5000}
          step={8}
          value={value.rowImageWidth ?? ''}
          onChange={(e) => onChange({rowImageWidth: e.target.value ? Number(e.target.value) : undefined})}
          className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Alto del marco (vacío = toda la altura)</label>
        <input
          type="number"
          min={16}
          max={3000}
          step={8}
          value={value.rowImageHeight ?? ''}
          onChange={(e) => onChange({rowImageHeight: e.target.value ? Number(e.target.value) : undefined})}
          className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberControl label="Offset X (px)" value={value.rowImageX} step={8} onChange={(v) => onChange({rowImageX: v})} />
        <NumberControl label="Offset Y (px)" value={value.rowImageY} step={8} onChange={(v) => onChange({rowImageY: v})} />
      </div>
      <SwitchControl label="Traslado al relevar" checked={value.rowImagePan ?? true} onChange={(v) => onChange({rowImagePan: v})} />
      <div className="mt-3">
        <label className="text-sm font-medium mb-1 block">Fondo del marco</label>
        <div className="grid grid-cols-2 gap-1">
          {([['canvas', 'Fondo del canvas'], ['dark', 'Oscuro']] as const).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({rowImageFrameBg: v})}
              className={`px-1 py-1 rounded-md text-xs font-medium transition-colors ${
                (value.rowImageFrameBg ?? 'canvas') === v ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted mt-1">
          Con «Fondo del canvas», el fondo del lienzo se ve detrás de la imagen del marco (útil con logos/PNG transparentes).
        </p>
      </div>
      <hr className="border-border-subtle my-2" />
      <SwitchControl label="Mostrar el puesto en la imagen" checked={value.rowImageLabel ?? false} onChange={(v) => onChange({rowImageLabel: v})} />
      {value.rowImageLabel && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumberControl label="Offset X (px)" value={value.rowImageLabelX} step={4} onChange={(v) => onChange({rowImageLabelX: v})} />
            <NumberControl label="Offset Y (px)" value={value.rowImageLabelY} step={4} onChange={(v) => onChange({rowImageLabelY: v})} />
          </div>
          <TextStyleControls
            label="Texto del puesto"
            value={value.rowImageLabelText}
            onChange={(patch) => onChange({rowImageLabelText: {...(value.rowImageLabelText ?? {}), ...patch}})}
           showTextTransform showSpacing showHighlight showUnderline maxSize={160}/>
        </>
      )}
      {(participants.length > 0) && (
        <div className="pt-2 border-t border-border-subtle">
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-sm font-medium block">Imagen por entidad</label>
            {((Object.keys(value.rowImages ?? {}).length > 0) || (Object.keys(value.rowImageModes ?? {}).length > 0)) && (
              <button type="button" onClick={() => onChange({rowImages: undefined, rowImageCrops: undefined, rowImageModes: undefined})} className="text-[10px] text-muted hover:text-red-500">
                Limpiar todas
              </button>
            )}
          </div>
          <EntitySearch value={q} onChange={setQ} shown={filtered.length} total={participants.length} />
          <div className="space-y-2">
            {filtered.map((p) => {
              const src = value.rowImages?.[p.label];
              const mode = value.rowImageModes?.[p.label] ?? 'url';
              const effSrc = mode === 'entity' ? p.image : src;
              const cr = value.rowImageCrops?.[p.label];
              const PW = 56;
              const PH = 64;
              const z = Math.max(Math.min(cr?.zoom ?? 1.12, 3), 0.1);
              const fx = Math.max(Math.min(cr?.focusX ?? 0, 1), -1);
              const fy = Math.max(Math.min(cr?.focusY ?? 0, 1), -1);
              const ex = PW * Math.abs(z - 1);
              const ey = PH * Math.abs(z - 1);
              const ptx = Math.max(-ex, Math.min(0, -ex / 2 - (fx * ex) / 2));
              const pty = Math.max(-ey, Math.min(0, -ey / 2 - (fy * ey) / 2));
              const previewStyle = {
                position: 'relative' as const,
                width: PW,
                height: PH,
                overflow: 'hidden' as const,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)',
              };
              return (
                <div key={p.label} className="border border-border-subtle rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-secondary truncate" title={p.label}>{p.label}</span>
                    {src && mode !== 'entity' && (
                      <button type="button" onClick={() => setImage(p.label)} className="text-muted hover:text-red-500 text-xs" aria-label={`Quitar imagen de ${p.label}`}>✕</button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    {([['entity', 'Entidad'], ['url', 'URL'], ['file', 'Archivo']] as const).map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setImageMode(p.label, v)}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                          mode === v ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-1">
                      {effSrc ? (
                        <div style={previewStyle}>
                          <img src={effSrc} alt="" style={{position: 'absolute' as const, left: 0, top: 0, width: '100%', height: '100%', transform: `translate(${ptx}px, ${pty}px) scale(${z})`, transformOrigin: '0 0', objectFit: 'cover' as const, maxWidth: 'none'}} />
                        </div>
                      ) : (
                        <div style={{...previewStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)'}}>
                          <span className="text-muted text-[10px]">vacío</span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <NumberControl label="Zoom" value={cr?.zoom} min={0.1} max={3} step={0.05} onChange={(v) => setCrop(p.label, {...cr, zoom: v})} />
                      <NumberControl label="Foco X" value={cr ? (cr.focusX ?? 0) * 100 : 0} min={-100} max={100} step={5} onChange={(v) => setCrop(p.label, {...cr, focusX: (v ?? 0) / 100})} />
                      <NumberControl label="Foco Y" value={cr ? (cr.focusY ?? 0) * 100 : 0} min={-100} max={100} step={5} onChange={(v) => setCrop(p.label, {...cr, focusY: (v ?? 0) / 100})} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-sm font-medium mb-1 block">Pan al relevar</label>
                    <div className="grid grid-cols-2 gap-1">
                      {([['ltr', '←→ Izq→Der'], ['rtl', '→← Der→Izq']] as const).map(([v, l]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setPanDir(p.label, v)}
                          className={`px-1 py-1 rounded-md text-xs font-medium transition-colors ${
                            (value.rowImagePanDirs?.[p.label] ?? 'ltr') === v ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {mode === 'url' && (
                    <div className="mt-2">
                      <label className="text-sm font-medium mb-1 block">URL</label>
                      <input
                        type="text"
                        value={src ?? ''}
                        onChange={(e) => setImage(p.label, e.target.value)}
                        placeholder="https://…"
                        className="w-full bg-elevated border border-border-default rounded-lg px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  )}
                  {mode === 'file' && (
                    <div className="mt-1.5">
                      <input
                        ref={(el) => { imageRefs.current[p.label] = el; }}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') setImage(p.label, reader.result);
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                        className="w-full text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-elevated file:px-2 file:py-1 file:text-xs file:font-medium"
                      />
                    </div>
                  )}
                  {mode === 'entity' && (
                    <p className="text-[10px] text-muted mt-1.5">
                      {p.image
                        ? 'Usa la imagen de la entidad (campo de imagen del bloque Datos).'
                        : 'La entidad no tiene imagen: define el campo de imagen en Datos o usa URL/Archivo.'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Collapsible>
  );
}

function RankingPanel({columns, fieldMeta, value, onChange, participants = [], templateSelector}: {
  templateSelector?: React.ReactNode;
  columns: string[];
  fieldMeta: ColumnMeta[];
  value: RankingConfig;
  onChange: (next: RankingConfig) => void;
  participants?: Participant[];
}) {
  const update = (patch: Partial<RankingConfig>) => onChange({...value, ...patch});

  return (
    <Tabs
      tabs={[{ id: 'data', label: 'Datos' }, { id: 'design', label: 'Diseño' }]}
      className="h-full"
    >
      {(activeTab) => (
        <div className="space-y-4 pb-12">
          {activeTab === 'data' && (
            <>
              {templateSelector}

              <Collapsible title="Datos" defaultOpen>
        <FieldSelect
          label="Entidad / etiqueta"
          value={value.labelField ?? ''}
          options={fieldMeta}
          fallback={columns}
          onChange={(f) => update({labelField: f || undefined})}
        />
        <FieldSelect
          label="Campo de valor"
          value={value.valueField ?? ''}
          options={fieldMeta}
          fallback={columns}
          role="numeric"
          onChange={(f) => update({valueField: f || undefined})}
        />
        <div>
          <label className="text-sm font-medium mb-1 block">Cómo se agrega el valor</label>
          <SelectControl
            value={value.valueAgg ?? 'none'}
            onChange={(e) => update({valueAgg: e.target.value as RankingConfig['valueAgg']})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="none">Cada fila aparte (sin agregar)</option>
            <option value="sum">Suma</option>
            <option value="count">Conteo (filas por entidad)</option>
            <option value="countDistinct">Conteo distintivo</option>
            <option value="avg">Promedio</option>
            <option value="weightedAvg">Promedio ponderado</option>
            <option value="min">Mínimo</option>
            <option value="max">Máximo</option>
          </SelectControl>
          <p className="text-[10px] text-muted mt-0.5">
            Agrupa las filas por etiqueta y agrega sus valores. Elige "Cada fila aparte" para mantener una entrada por fila.
          </p>
        </div>
        {value.valueAgg === 'weightedAvg' && (
          <FieldSelect
            label="Campo de peso (ponderado)"
            value={value.weightField ?? ''}
            options={fieldMeta}
            fallback={columns}
            role="numeric"
            onChange={(f) => update({weightField: f || undefined})}
          />
        )}
        <FieldSelect
          label="Imagen de la entidad (opcional)"
          value={value.imageField ?? ''}
          options={fieldMeta}
          fallback={columns}
          role="any"
          optional
          onChange={(f) => update({imageField: f || undefined})}
        />
      </Collapsible>

      <Collapsible title="Ranking" defaultOpen>
        <div>
          <label className="text-sm font-medium mb-1 block">Modo de ranking</label>
          <div className="grid grid-cols-2 gap-1">
            {([{v: 'bars', l: 'Barras'}, {v: 'table', l: 'Tabla'}] as const).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => update({rankMode: o.v})}
                className={`px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  (value.rankMode ?? 'bars') === o.v
                    ? 'bg-amber-500 text-black'
                    : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted mt-0.5">
            Barras: barras animadas. Tabla: filas minimalistas con separadores horizontales (cuenta, revelado y marco de imagen se mantienen).
          </p>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Revelado</label>
          <div className="grid grid-cols-2 gap-1">
            {([{v: 'desc', l: 'Cuenta regresiva'}, {v: 'asc', l: 'Ascendente'}] as const).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => update({revealDirection: o.v})}
                className={`px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  (value.revealDirection ?? 'desc') === o.v
                    ? 'bg-amber-500 text-black'
                    : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted mt-0.5">
            Cuenta regresiva: cae primero el último puesto y el #1 se revela al final. Ascendente: entra primero el #1.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Máximo de entidades</label>
          <input
            type="number"
            min={0}
            max={50}
            value={value.maxRows ?? 0}
            onChange={(e) => update({maxRows: Number(e.target.value) || undefined})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <p className="text-[10px] text-muted mt-0.5">0 = sin límite. Limita cuántas entidades participan (el top-N por valor).</p>
        </div>
        <SwitchControl label="Contar cada dato hasta su valor" checked={value.countUp ?? true} onChange={(v) => update({countUp: v})} />
        <p className="text-[10px] text-muted mt-0.5">
          El valor de cada fila cuenta desde 0 hasta su cifra real mientras la fila entra en pantalla. Apagado = el valor aparece ya resuelto.
        </p>
        <SwitchControl label="Mostrar puesto (#1)" checked={value.showRank ?? true} onChange={(v) => update({showRank: v})} />
        <SwitchControl label="Mostrar el dato" checked={value.showValue ?? true} onChange={(v) => update({showValue: v})} />
        <div>
          <label className="text-sm font-medium mb-1 block">Prefijo del puesto</label>
          <input
            value={value.rankPrefix ?? '#'}
            onChange={(e) => update({rankPrefix: e.target.value})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <p className="text-[10px] text-muted mt-0.5">Vacío = sin prefijo (en vez de #1 muestra 1).</p>
        </div>
      </Collapsible>
            </>
          )}
          {activeTab === 'design' && (
            <>
      {/* ============ HEADER ============ */}
      <HeaderSection value={value} update={update} />

      {/* ============ FILAS ============ */}
      <Collapsible title="Filas">
        <SliderNumberInput label="Separación vertical (px)" value={value.rowGap ?? 0} min={0} max={120} step={2} onChange={(v) => update({rowGap: v})} />
        <SliderNumberInput label="Separación horizontal (px)" value={value.rowGapH ?? 0} min={0} max={80} step={2} onChange={(v) => update({rowGapH: v})} />
        <p className="text-[10px] text-muted">
          Aplican a los dos modos (barras y tabla). La separación horizontal incluye el puesto en el cálculo (su ancho más el hueco) y puede establecerse a 0.
        </p>
        <SelectControl
          label="Formato del valor"
          value={value.valueFormat ?? 'number'}
          options={VALUE_FORMATS}
          onChange={(e) => update({valueFormat: e.target.value as ValueFormat})}
        />
        {(value.valueFormat ?? 'number') === 'currency' && (
          <div>
            <label className="text-sm font-medium mb-1 block">Símbolo de moneda</label>
            <input
              value={value.currencySymbol ?? '$'}
              onChange={(e) => update({currencySymbol: e.target.value || undefined})}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}
        {(value.rankMode ?? 'bars') === 'bars' && (
          <>
            <SliderNumberInput
              label="Ancho de las barras (%)"
              value={value.barWidth ? Math.round(value.barWidth * 100) : 100}
              min={40}
              max={150}
              step={5}
              onChange={(v) => update({barWidth: v ? v / 100 : undefined})}
            />
            <p className="text-[10px] text-muted">
              Multiplica el ancho de la barra dentro de su propio espacio flex (100% = el actual). Reduce para que el valor o el avatar respiren.
            </p>
          </>
        )}
        <div className="pt-2 mt-1 border-t border-border-subtle">
          <p className="text-[10px] text-muted mb-1.5">Entrada de la fila (puesto, avatar, barra/etiqueta, dato) con trayectoria recta según la dirección cardinal.</p>
          <label className="text-sm font-medium mb-1 block">Dirección general</label>
          <div className="grid grid-cols-4 gap-1 mb-2">
            {([['left', '←'], ['bottom', '↓'], ['right', '→'], ['top', '↑']] as const).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => update({rowEntryDir: v})}
                className={`px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  (value.rowEntryDir ?? 'bottom') === v ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="text-sm font-medium mb-1 block">Elementos</label>
          <div className="grid grid-cols-2 gap-1">
            {([['together', 'Todos iguales'], ['custom', 'Por elemento']] as const).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => update({rowEntryMode: v})}
                className={`px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  (value.rowEntryMode ?? 'together') === v ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted mt-1.5">
            "Todos iguales" usa la dirección general. "Por elemento" deja fijar la dirección y el retardo secuencial de cada elemento.
          </p>
        </div>
        {(value.rowEntryMode ?? 'together') === 'custom' && (
          <div className="pt-2 mt-1 border-t border-border-subtle space-y-2">
            {ROW_ENTRY_ELEMENTS.map(({id, label: elLabel}) => {
              const dir = value.rowEntryDirs?.[id];
              const delay = value.rowEntryDelays?.[id] ?? 0;
              const reset = () => {
                const dirs = {...(value.rowEntryDirs ?? {})};
                const delays = {...(value.rowEntryDelays ?? {})};
                delete dirs[id];
                delete delays[id];
                update({rowEntryDirs: dirs, rowEntryDelays: delays});
              };
              return (
                <div key={id} className="border border-border-subtle rounded-lg p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-secondary">{elLabel}</span>
                    <div className="flex gap-1">
                      {([['left', '←'], ['bottom', '↓'], ['right', '→'], ['top', '↑']] as const).map(([v, l]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => update({rowEntryDirs: {...(value.rowEntryDirs ?? {}), [id]: v}})}
                          className={`px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                            (dir ?? value.rowEntryDir ?? 'bottom') === v ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <NumberControl label="Retardo (frames)" value={delay} min={0} max={30} step={1} onChange={(v) => update({rowEntryDelays: {...(value.rowEntryDelays ?? {}), [id]: v ?? 0}})} />
                    </div>
                    {(dir !== undefined || delay > 0) && (
                      <button type="button" onClick={reset} className="text-[10px] text-muted hover:text-red-500 underline shrink-0 mt-4">
                        restablecer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-muted">Sin dirección propia = usa la dirección general. El retardo entra a cada elemento en orden secuencial.</p>
          </div>
        )}
        {(value.rankMode ?? 'bars') === 'table' && (
          <div className="pt-2 mt-1 border-t border-border-subtle">
            <p className="text-[10px] text-muted mb-1.5">Separadores inferiores de la tabla.</p>
            <SliderNumberInput label="Grosor (px)" value={value.tableSepWidth ?? 1} min={0} max={8} step={1} onChange={(v) => update({tableSepWidth: v || undefined})} />
            <ColorPickerControl label="Color" value={value.tableSepColor} onChange={(v) => update({tableSepColor: v})} />
          </div>
        )}
        <div className="pt-2 mt-1 border-t border-border-subtle">
          <p className="text-[10px] text-muted mb-1.5">Posición del grupo de filas (offset en px desde su lugar por defecto).</p>
          <div className="grid grid-cols-2 gap-2">
            <NumberControl label="X (px)" value={value.rowsX} step={4} onChange={(v) => update({rowsX: v})} />
            <NumberControl label="Y (px)" value={value.rowsY} step={4} onChange={(v) => update({rowsY: v})} />
          </div>
        </div>
      </Collapsible>

      {/* ============ ETIQUETAS ============ */}
      <Collapsible title="Etiquetas">
        <TextStyleControls label="Texto del puesto (#1)" value={value.rankText} onChange={(patch) => update({rankText: {...(value.rankText ?? {}), ...patch}})}  showTextTransform showSpacing showHighlight showUnderline maxSize={160}/>
        <p className="text-[10px] text-muted mt-0.5">
          El número de posición (#1, #2...) que aparece a la izquierda de cada fila.
        </p>
        <div className="h-px bg-border-default my-3" />
        <TextStyleControls label="Texto de la etiqueta" value={value.labelText} onChange={(patch) => update({labelText: {...(value.labelText ?? {}), ...patch}})}  showTextTransform showSpacing showHighlight showUnderline maxSize={160}/>
        <p className="text-[10px] text-muted mt-0.5">
          El nombre de la entidad dentro de la barra.
        </p>
        <div className="h-px bg-border-default my-3" />
        <TextStyleControls label="Texto del dato" value={value.valueText} onChange={(patch) => update({valueText: {...(value.valueText ?? {}), ...patch}})}  showTextTransform showSpacing showHighlight showUnderline maxSize={160}/>
        <p className="text-[10px] text-muted mt-0.5">
          El valor numérico que viaja dentro de la barra.
        </p>
      </Collapsible>

      {/* ============ LIENZO ============ */}
      <CanvasSection value={value} update={update} />

      {/* ============ AVATAR ============ */}
      <AvatarSection value={value} onChange={update} participants={participants} />

      {/* ============ IMAGEN POR PUESTO ============ */}
      <RowImageSection value={value} onChange={update} participants={participants} />

      {/* ============ ADICIONALES ============ */}
      <OverlaysSection value={value} update={update} />
            </>
          )}
        </div>
      )}
    </Tabs>
  );
}

export function AnimationConfigPanel({templateId, columns, fieldMeta, value, onChange, participants = [], templateSelector}: AnimationConfigPanelProps) {
  if (templateId === 'ranking') {
    return <RankingPanel columns={columns} fieldMeta={fieldMeta} value={value as RankingConfig} onChange={onChange as (n: RankingConfig) => void} participants={participants} templateSelector={templateSelector} />;
  }
  if (templateId === 'race-scrolling') {
    return <RaceScrollingPanel templateId={templateId} columns={columns} fieldMeta={fieldMeta} value={value as RaceScrollingConfig} onChange={onChange as (n: RaceScrollingConfig) => void} participants={participants} templateSelector={templateSelector} />;
  }
  if (templateId !== 'timeline-race') return null;
  return <TimelineRacePanel templateId={templateId} columns={columns} fieldMeta={fieldMeta} value={value as TimelineRaceConfig} onChange={onChange as (n: TimelineRaceConfig) => void} participants={participants} templateSelector={templateSelector} />;
}


function RowOrderControl({value, onChange}: {value: ('bar' | 'avatar')[]; onChange: (order: ('bar' | 'avatar')[]) => void}) {
  const rows = Array.from(new Set(value.filter((s) => s === 'bar' || s === 'avatar'))) as ('bar' | 'avatar')[];
  const normal: ('bar' | 'avatar')[] = rows.length === 2 ? rows : ['bar', 'avatar'];
  const labelOf = (s: 'bar' | 'avatar') => (s === 'bar' ? 'Barra' : 'Avatar');
  const swap = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= normal.length) return;
    const next = [...normal];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <div className="flex gap-1">
        {normal.map((seg, i) => (
          <div key={seg} className="flex items-center gap-0.5 flex-1">
            <button
              type="button"
              onClick={() => swap(i, -1)}
              disabled={i === 0}
              className="text-xs text-muted hover:text-primary disabled:opacity-30 px-1"
              aria-label={`Mover ${labelOf(seg)} a la izquierda`}
            >
              ◀
            </button>
            <span className="flex-1 text-center text-xs font-medium text-secondary bg-elevated rounded px-1.5 py-1 select-none truncate">{labelOf(seg)}</span>
            <button
              type="button"
              onClick={() => swap(i, 1)}
              disabled={i === normal.length - 1}
              className="text-xs text-muted hover:text-primary disabled:opacity-30 px-1"
              aria-label={`Mover ${labelOf(seg)} a la derecha`}
            >
              ▶
            </button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted mt-0.5">Usa ◀ ▶ para reordenar los elementos de cada fila. El dato siempre va al extremo derecho de la barra.</p>
    </div>
  );
}
