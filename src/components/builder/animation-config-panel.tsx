'use client';

import React, {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import type {ColumnMeta} from '@/components/builder/chart-config-panel';
import type {TimelineRaceConfig, RankingConfig, DateFormat, AvatarShape, AvatarCrop, RaceTextStyle, ValueFormat, RowEntryElement, CommonHeaderConfig, CommonCanvasConfig} from '@/lib/animation-config';
import {avatarCropRect} from '@/lib/animation-config';
import {FONT_PRESETS, PALETTES} from '@/lib/chart-config';
import {ColorInput as AutoColorInput} from './text-controls';

const VALUE_FORMATS: {value: ValueFormat; label: string}[] = [
  {value: 'number', label: 'Número (1.234)'},
  {value: 'short', label: 'Compacto (1,2k)'},
  {value: 'decimal', label: 'Decimal (1,23)'},
  {value: 'percent', label: 'Porcentaje (%)'},
  {value: 'currency', label: 'Moneda ($1.234)'},
  {value: 'hhmmss', label: 'Duración (hh:mm:ss)'},
];

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
  value: TimelineRaceConfig | RankingConfig;
  onChange: (next: TimelineRaceConfig | RankingConfig) => void;
  participants?: Participant[];
};

// Collapsible accordion section (Flourish-style), mirrors the static chart
// config panel. "Datos" is open by default.
function Section({title, defaultOpen = false, children}: {title: string; defaultOpen?: boolean; children: React.ReactNode}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium font-display transition-colors ${
          open ? 'bg-amber-500/10 text-amber-500' : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
        }`}
      >
        {title}
        <ChevronDown size={14} className={`transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

// Search box that filters a per-entity list by label, plus an "N de M" counter
// so it's obvious a filter is active (and how many rows matched).
function EntitySearch({value, onChange, shown, total}: {value: string; onChange: (v: string) => void; shown: number; total: number}) {
  const active = value.trim() !== '';
  return (
    <div>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar entidad…"
          className="w-full bg-elevated border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      {active && <p className="text-[10px] text-muted mt-1">{shown} de {total} entidades</p>}
    </div>
  );
}

// Title + subtitle, position offsets and typography. Reused by every template
// so the header settings stay identical everywhere.
function HeaderSection({value, update}: {value: CommonHeaderConfig; update: (patch: Partial<CommonHeaderConfig>) => void}) {
  return (
    <Section title="Header" defaultOpen>
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
          <NumberInput label="X (px)" value={value.titleX} min={-400} max={400} step={4} onChange={(v) => update({titleX: v})} />
          <NumberInput label="Y (px)" value={value.titleY} min={-400} max={400} step={4} onChange={(v) => update({titleY: v})} />
        </div>
      </div>
      <div className="pt-2 mt-1 border-t border-border-subtle">
        <RaceTextControls label="Texto del título" value={value.titleText} onChange={(patch) => update({titleText: {...(value.titleText ?? {}), ...patch}})} />
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
          <NumberInput label="X (px)" value={value.subtitleX} min={-400} max={400} step={4} onChange={(v) => update({subtitleX: v})} />
          <NumberInput label="Y (px)" value={value.subtitleY} min={-400} max={400} step={4} onChange={(v) => update({subtitleY: v})} />
        </div>
      </div>
      <div className="pt-2 mt-1 border-t border-border-subtle">
        <RaceTextControls label="Texto del subtítulo" value={value.subtitleText} onChange={(patch) => update({subtitleText: {...(value.subtitleText ?? {}), ...patch}})} />
      </div>
    </Section>
  );
}

// Canvas background: type, colors and pattern/gradient/image options. Reused by
// every template so the canvas settings stay identical everywhere.
function CanvasSection({value, update}: {value: CommonCanvasConfig; update: (patch: Partial<CommonCanvasConfig>) => void}) {
  return (
    <Section title="Canvas">
      <SelectControl
        label="Tipo de fondo"
        value={value.backgroundType ?? 'color'}
        options={[
          {value: 'color', label: 'Color único'},
          {value: 'pattern', label: 'Patrón'},
          {value: 'gradient', label: 'Degradado'},
          {value: 'image', label: 'Imagen'},
        ]}
        onChange={(v) => update({backgroundType: v as CommonCanvasConfig['backgroundType']})}
      />

      {(value.backgroundType ?? 'color') === 'color' && (
        <ColorInput label="Color de fondo" value={value.background ?? '#0a0a0a'} onChange={(v) => update({background: v || undefined})} />
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
            onChange={(v) => update({backgroundPattern: v as CommonCanvasConfig['backgroundPattern']})}
          />
          <ColorInput label="Color del patrón" value={value.background ?? '#3b82f6'} onChange={(v) => update({background: v || undefined})} />
          <SliderNumberInput label="Opacidad (%)" value={Math.round((value.backgroundOpacity ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => update({backgroundOpacity: v ? v / 100 : undefined})} />
        </>
      )}

      {(value.backgroundType ?? 'color') === 'gradient' && (
        <>
          <ColorInput label="Color inicial" value={value.background ?? '#0a0a0a'} onChange={(v) => update({background: v || undefined})} />
          <ColorInput label="Color final" value={value.backgroundSecondary ?? '#1f2937'} onChange={(v) => update({backgroundSecondary: v || undefined})} />
          <SliderNumberInput label="Ángulo (grados)" value={value.backgroundAngle ?? 135} min={0} max={360} step={15} onChange={(v) => update({backgroundAngle: v || undefined})} />
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
            onChange={(v) => update({backgroundFit: v as CommonCanvasConfig['backgroundFit']})}
          />
          <ColorInput label="Color base (debajo)" value={value.background ?? '#0a0a0a'} onChange={(v) => update({background: v || undefined})} />
          <SliderNumberInput label="Opacidad (%)" value={Math.round((value.backgroundOpacity ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => update({backgroundOpacity: v ? v / 100 : undefined})} />
        </>
      )}

      <SliderNumberInput label="Desenfoque del fondo (blur px)" value={value.backgroundBlur ?? 0} min={0} max={30} step={1} onChange={(v) => update({backgroundBlur: v || undefined})} />
    </Section>
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
};

// Per-template Avatar section (size, shape, radius + per-entity crop). Shared
// by both animated templates so the controls stay identical.
function AvatarSection({value, onChange, participants = []}: {
  value: AvatarFields;
  onChange: (patch: Partial<AvatarFields>) => void;
  participants?: Participant[];
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
    <Section title="Avatar">
      <Toggle label="Mostrar avatares" checked={value.showAvatar ?? true} onChange={(v) => onChange({showAvatar: v})} />
      <div>
        <label className="text-sm font-medium mb-1 block">Tamaño</label>
        <input
          type="number"
          min={16}
          max={160}
          step={2}
          value={value.avatarSize ?? ''}
          onChange={(e) => onChange({avatarSize: e.target.value ? Number(e.target.value) : undefined})}
          className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <p className="text-[10px] text-muted mt-0.5">Vacío = automático según el tamaño del lienzo.</p>
      </div>
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
        <NumberInput label="Radio de esquina (vacío = auto)" value={value.avatarRadius} min={0} max={60} step={1} onChange={(v) => onChange({avatarRadius: v})} />
      )}
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
                      <NumberInput label="Zoom" value={cr?.zoom} min={0.1} max={3} step={0.05} onChange={(v) => setCrop(p.label, {...cr, zoom: v})} />
                      <NumberInput label="Foco X" value={cr ? (cr.focusX ?? 0) * 100 : 0} min={-100} max={100} step={5} onChange={(v) => setCrop(p.label, {...cr, focusX: (v ?? 0) / 100})} />
                      <NumberInput label="Foco Y" value={cr ? (cr.focusY ?? 0) * 100 : 0} min={-100} max={100} step={5} onChange={(v) => setCrop(p.label, {...cr, focusY: (v ?? 0) / 100})} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Section>
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
function TimelineRacePanel({templateId, columns, fieldMeta, value, onChange, participants = []}: TimelineRacePanelProps) {
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
    <div className="space-y-3">
      <HeaderSection value={value} update={update} />

      <Section title="Datos" defaultOpen>
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
      </Section>

      <Section title="Eje X" defaultOpen>
        <div>
          <label className="text-sm font-medium mb-1 block">Formato de fecha</label>
          <select
            value={fmt}
            onChange={(e) => update({dateFormat: e.target.value as DateFormat})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="day">Día</option>
            <option value="month">Mes</option>
            <option value="year">Año</option>
          </select>
          <p className="text-[10px] text-muted mt-0.5">
            Agrupa los datos por día, mes o año y re-agrega el valor acumulado en cada rango.
          </p>
        </div>
        <Toggle
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
          onChange={(v) => update({valueFormat: v as ValueFormat})}
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
      </Section>

      <Section title="Eje Y">
        <Toggle
          label="Eje vertical (Y)"
          checked={value.showYAxis ?? false}
          onChange={(v) => update({showYAxis: v || undefined})}
        />
        <ColorInput label="Color del eje" value={value.yAxisColor ?? '#334155'} onChange={(v) => update({yAxisColor: v || undefined})} />
        <SliderNumberInput label="Grosor del eje (px)" value={value.yAxisWidth ?? 2} min={1} max={12} step={1} onChange={(v) => update({yAxisWidth: v || undefined})} />
        <p className="text-[10px] text-muted">
          Línea vertical en el origen (borde izquierdo) de las barras.
        </p>
      </Section>

      <Section title="Fecha">
        <Toggle
          label="Mostrar fecha en pantalla"
          checked={value.showDateLabel ?? true}
          onChange={(v) => update({showDateLabel: v})}
        />
        <div className="pt-2 mt-1 border-t border-border-subtle">
          <p className="text-[10px] text-muted mb-1.5">Posición de la fecha (offset en px desde la esquina inferior derecha).</p>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="X (px)" value={value.dateX} min={-400} max={400} step={4} onChange={(v) => update({dateX: v})} />
            <NumberInput label="Y (px)" value={value.dateY} min={-400} max={400} step={4} onChange={(v) => update({dateY: v})} />
          </div>
        </div>
        <div className="pt-2 mt-1 border-t border-border-subtle">
          <RaceTextControls label="Texto de la fecha" value={value.dateText} onChange={(patch) => update({dateText: {...(value.dateText ?? {}), ...patch}})} />
        </div>
      </Section>

      <Section title="Ranking">
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
        <Toggle
          label="Efecto podio al final"
          checked={value.podiumEffect ?? true}
          onChange={(v) => update({podiumEffect: v})}
        />
        <p className="text-[10px] text-muted">
          Cuando se revela el ganador, lo agranda con brillo y atenúa a los que no quedaron primeros. Apagado = sin atenuación ni brillo.
        </p>
      </Section>

      {/* ============ AVATAR (compartido) ============ */}
      <AvatarSection value={value} onChange={update} participants={participants} />

      {/* ============ BARRAS ============ */}
      {participants.length > 0 && (
        <Section title="Barras">
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
          <NumberInput label="Radio de esquina de la barra (vacío = píldora)" value={value.barRadius} min={0} max={60} step={1} onChange={(v) => update({barRadius: v})} />
          <NumberInput label="Grosor de la barra (px, vacío = automático)" value={value.barThickness} min={4} max={120} step={2} onChange={(v) => update({barThickness: v})} />
          <div className="pt-2 mt-1 border-t border-border-subtle">
            <p className="text-[10px] text-muted mb-1.5">Posición del grupo de filas y eje X (offset en px desde su lugar por defecto).</p>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="X (px)" value={value.barsX} min={-400} max={400} step={4} onChange={(v) => update({barsX: v})} />
              <NumberInput label="Y (px)" value={value.barsY} min={-400} max={400} step={4} onChange={(v) => update({barsY: v})} />
            </div>
          </div>
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
            <div className="space-y-2">
              {PALETTES.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setBarPalette(p.colors)}
                  className={`w-full text-left rounded-lg border p-1.5 transition-colors ${
                    JSON.stringify(barPalette) === JSON.stringify(p.colors)
                      ? 'border-amber-500/60'
                      : 'border-border-subtle hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-secondary">{p.name}</span>
                    <span className="text-[10px] text-muted">Aplicar</span>
                  </div>
                  <div className="flex gap-0.5">
                    {p.colors.slice(0, 8).map((c, i) => (
                      <div key={i} className="flex-1 h-3 rounded-sm" style={{backgroundColor: c}} />
                    ))}
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBarPalette(undefined)}
                className="w-full text-left rounded-lg border border-border-subtle p-1.5 hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-secondary">Ninguna (por defecto)</span>
                  <span className="text-[10px] text-muted">Quitar</span>
                </div>
                <div className="flex gap-0.5">
                  <div className="flex-1 h-3 rounded-sm" style={{backgroundColor: '#FFD700'}} />
                  <div className="flex-1 h-3 rounded-sm" style={{backgroundColor: '#3f3f46'}} />
                </div>
              </button>
            </div>
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
        </Section>
      )}

      {/* ============ ETIQUETA ============ */}
      <Section title="Etiqueta">
        <RaceTextControls label="Texto de la etiqueta" value={value.labelText} onChange={(patch) => update({labelText: {...(value.labelText ?? {}), ...patch}})} />
        <p className="text-[10px] text-muted mt-0.5">
          El nombre de la entidad que se apoya sobre la barra en el outro final.
        </p>
        <div className="h-px bg-border-default my-3" />
        <RaceTextControls label="Texto del dato (dentro de la barra)" value={value.valueText} onChange={(patch) => update({valueText: {...(value.valueText ?? {}), ...patch}})} />
        <p className="text-[10px] text-muted mt-0.5">
          El valor acumulado que viaja dentro de cada barra.
        </p>
      </Section>

      {/* ============ CANVAS ============ */}
      <CanvasSection value={value} update={update} />
    </div>
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
    <Section title="Imagen por puesto">
      <p className="text-[10px] text-muted">
        Marco global en el costado derecho del canvas: las filas se comprimen a la izquierda y el marco muestra la imagen del puesto que se está revelando, con corte directo (sin fundido) y un traslado lento (dirección configurable por imagen) hasta que entra el siguiente puesto. Un zoom mínimo garantiza que foco y traslado funcionen aunque dejes el zoom en 1. El ancho no tiene tope: puede extenderse hasta todo el ancho del canvas (las filas se comprimen al mínimo).
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
        <NumberInput label="Offset X (px)" value={value.rowImageX} min={-1600} max={1600} step={8} onChange={(v) => onChange({rowImageX: v})} />
        <NumberInput label="Offset Y (px)" value={value.rowImageY} min={-1600} max={1600} step={8} onChange={(v) => onChange({rowImageY: v})} />
      </div>
      <Toggle label="Traslado al relevar" checked={value.rowImagePan ?? true} onChange={(v) => onChange({rowImagePan: v})} />
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
      <Toggle label="Mostrar el puesto en la imagen" checked={value.rowImageLabel ?? false} onChange={(v) => onChange({rowImageLabel: v})} />
      {value.rowImageLabel && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="Offset X (px)" value={value.rowImageLabelX} min={-600} max={600} step={4} onChange={(v) => onChange({rowImageLabelX: v})} />
            <NumberInput label="Offset Y (px)" value={value.rowImageLabelY} min={-600} max={600} step={4} onChange={(v) => onChange({rowImageLabelY: v})} />
          </div>
          <RaceTextControls
            label="Texto del puesto"
            value={value.rowImageLabelText}
            onChange={(patch) => onChange({rowImageLabelText: {...(value.rowImageLabelText ?? {}), ...patch}})}
          />
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
              const z = Math.max(cr?.zoom ?? 1, 1.12);
              const fx = Math.max(Math.min(cr?.focusX ?? 0, 1), -1);
              const fy = Math.max(Math.min(cr?.focusY ?? 0, 1), -1);
              const ex = PW * (z - 1);
              const ey = PH * (z - 1);
              const ptx = z >= 1 ? Math.max(-ex, Math.min(0, -ex / 2 - (fx * ex) / 2)) : -ex / 2 - (fx * ex) / 2;
              const pty = z >= 1 ? Math.max(-ey, Math.min(0, -ey / 2 - (fy * ey) / 2)) : -ey / 2 - (fy * ey) / 2;
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
                      <NumberInput label="Zoom" value={cr?.zoom} min={0.1} max={3} step={0.05} onChange={(v) => setCrop(p.label, {...cr, zoom: v})} />
                      <NumberInput label="Foco X" value={cr ? (cr.focusX ?? 0) * 100 : 0} min={-100} max={100} step={5} onChange={(v) => setCrop(p.label, {...cr, focusX: (v ?? 0) / 100})} />
                      <NumberInput label="Foco Y" value={cr ? (cr.focusY ?? 0) * 100 : 0} min={-100} max={100} step={5} onChange={(v) => setCrop(p.label, {...cr, focusY: (v ?? 0) / 100})} />
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
    </Section>
  );
}

function RankingPanel({columns, fieldMeta, value, onChange, participants = []}: {
  columns: string[];
  fieldMeta: ColumnMeta[];
  value: RankingConfig;
  onChange: (next: RankingConfig) => void;
  participants?: Participant[];
}) {
  const update = (patch: Partial<RankingConfig>) => onChange({...value, ...patch});

  return (
    <div className="space-y-3">
      <HeaderSection value={value} update={update} />

      <Section title="Datos" defaultOpen>
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
          <select
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
          </select>
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
      </Section>

      <Section title="Ranking" defaultOpen>
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
        <Toggle label="Contar cada dato hasta su valor" checked={value.countUp ?? true} onChange={(v) => update({countUp: v})} />
        <p className="text-[10px] text-muted mt-0.5">
          El valor de cada fila cuenta desde 0 hasta su cifra real mientras la fila entra en pantalla. Apagado = el valor aparece ya resuelto.
        </p>
        <Toggle label="Mostrar puesto (#1)" checked={value.showRank ?? true} onChange={(v) => update({showRank: v})} />
        <Toggle label="Mostrar el dato" checked={value.showValue ?? true} onChange={(v) => update({showValue: v})} />
        <div>
          <label className="text-sm font-medium mb-1 block">Prefijo del puesto</label>
          <input
            value={value.rankPrefix ?? '#'}
            onChange={(e) => update({rankPrefix: e.target.value})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <p className="text-[10px] text-muted mt-0.5">Vacío = sin prefijo (en vez de #1 muestra 1).</p>
        </div>
      </Section>

      <Section title="Filas">
        <SliderNumberInput label="Separación vertical (px)" value={value.rowGap ?? 0} min={0} max={120} step={2} onChange={(v) => update({rowGap: v})} />
        <SliderNumberInput label="Separación horizontal (px)" value={value.rowGapH ?? 0} min={0} max={80} step={2} onChange={(v) => update({rowGapH: v})} />
        <p className="text-[10px] text-muted">
          Aplican a los dos modos (barras y tabla). La separación horizontal incluye el puesto en el cálculo (su ancho más el hueco) y puede establecerse a 0.
        </p>
        <SelectControl
          label="Formato del valor"
          value={value.valueFormat ?? 'number'}
          options={VALUE_FORMATS}
          onChange={(v) => update({valueFormat: v as ValueFormat})}
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
                      <NumberInput label="Retardo (frames)" value={delay} min={0} max={30} step={1} onChange={(v) => update({rowEntryDelays: {...(value.rowEntryDelays ?? {}), [id]: v ?? 0}})} />
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
            <ColorInput label="Color" value={value.tableSepColor} onChange={(v) => update({tableSepColor: v})} />
          </div>
        )}
        <div className="pt-2 mt-1 border-t border-border-subtle">
          <p className="text-[10px] text-muted mb-1.5">Posición del grupo de filas (offset en px desde su lugar por defecto).</p>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="X (px)" value={value.rowsX} min={-400} max={400} step={4} onChange={(v) => update({rowsX: v})} />
            <NumberInput label="Y (px)" value={value.rowsY} min={-400} max={400} step={4} onChange={(v) => update({rowsY: v})} />
          </div>
        </div>
      </Section>

      <AvatarSection value={value} onChange={update} participants={participants} />

      <RowImageSection value={value} onChange={update} participants={participants} />

      <Section title="Etiqueta">
        <RaceTextControls label="Texto del puesto (#1)" value={value.rankText} onChange={(patch) => update({rankText: {...(value.rankText ?? {}), ...patch}})} />
        <p className="text-[10px] text-muted mt-0.5">
          El número de posición (#1, #2...) que aparece a la izquierda de cada fila.
        </p>
        <div className="h-px bg-border-default my-3" />
        <RaceTextControls label="Texto de la etiqueta" value={value.labelText} onChange={(patch) => update({labelText: {...(value.labelText ?? {}), ...patch}})} />
        <p className="text-[10px] text-muted mt-0.5">
          El nombre de la entidad dentro de la barra.
        </p>
        <div className="h-px bg-border-default my-3" />
        <RaceTextControls label="Texto del dato" value={value.valueText} onChange={(patch) => update({valueText: {...(value.valueText ?? {}), ...patch}})} />
        <p className="text-[10px] text-muted mt-0.5">
          El valor numérico que viaja dentro de la barra.
        </p>
      </Section>

      <CanvasSection value={value} update={update} />
    </div>
  );
}

export function AnimationConfigPanel({templateId, columns, fieldMeta, value, onChange, participants = []}: AnimationConfigPanelProps) {
  if (templateId === 'ranking') {
    return <RankingPanel columns={columns} fieldMeta={fieldMeta} value={value as RankingConfig} onChange={onChange as (n: RankingConfig) => void} participants={participants} />;
  }
  if (templateId !== 'timeline-race') return null;
  return <TimelineRacePanel templateId={templateId} columns={columns} fieldMeta={fieldMeta} value={value as TimelineRaceConfig} onChange={onChange as (n: TimelineRaceConfig) => void} participants={participants} />;
}

function SelectControl({label, value, options, onChange}: {label: string; value: string; options: {value: string; label: string}[]; onChange: (v: string) => void}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FileUploadInput({label, value, onLoad, onClear}: {label: string; value?: string; onLoad: (dataUrl: string) => void; onClear: () => void}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') onLoad(reader.result);
          };
          reader.readAsDataURL(file);
          e.target.value = '';
        }}
        className="w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-elevated file:px-3 file:py-2 file:text-sm file:font-medium"
      />
      {value && (
        <div className="flex items-center gap-2 mt-1">
          <img src={value} alt="fondo" className="h-10 w-16 object-cover rounded border border-border-default" />
          <button type="button" onClick={() => {onClear(); if (inputRef.current) inputRef.current.value = '';}} className="text-[10px] text-muted hover:text-red-500">
            Quitar imagen
          </button>
        </div>
      )}
    </div>
  );
}

function Toggle({label, checked, onChange}: {label: string; checked: boolean; onChange: (v: boolean) => void}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm font-medium">{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 rounded-full bg-elevated border border-border-default peer-checked:bg-amber-500 transition-colors" />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </div>
    </label>
  );
}

function FieldSelect({
  label,
  value,
  options = [],
  fallback = [],
  role = 'any',
  onChange,
  optional = false,
}: {
  label: string;
  value: string;
  options?: ColumnMeta[];
  fallback?: string[];
  role?: 'any' | 'numeric' | 'date';
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  const useMeta = options.length > 0;
  const numericList = options.filter((o) => o.isNumeric);

  const pickList = useMeta
    ? role === 'numeric'
      ? numericList
      : options
    : fallback;

  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        {optional && <option value="">Ninguno</option>}
        {pickList.map((c) => {
          const alias = typeof c === 'string' ? c : c.alias;
          return (
            <option key={alias} value={alias}>
              {alias}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function NumberInput({label, value, min, max, step = 1, onChange}: {label: string; value?: number; min: number; max: number; step?: number; onChange: (v: number | undefined) => void}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
    </div>
  );
}

function SliderNumberInput({label, value, min, max, step = 1, onChange}: {label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium">{label}</label>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-16 bg-elevated border border-border-default rounded px-2 py-1 text-xs text-right font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-border-subtle rounded-lg appearance-none cursor-pointer accent-amber-500"
      />
    </div>
  );
}

function ColorInput({label, value, onChange}: {label: string; value?: string; onChange: (v: string) => void}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="color"
        value={value ?? '#888888'}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-border-default bg-transparent"
        aria-label={label}
      />
      <span className="text-xs text-secondary">{label}</span>
    </label>
  );
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

function RaceTextControls({label, value, onChange}: {label: string; value?: RaceTextStyle; onChange: (patch: Partial<RaceTextStyle>) => void}) {
  const v = value ?? {};
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div>
        <label className="text-sm font-medium mb-1 block">Tipografía</label>
        <select
          value={v.fontFamily ?? ''}
          onChange={(e) => onChange({fontFamily: e.target.value || undefined})}
          className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Por defecto</option>
          {FONT_PRESETS.map((f) => (
            <option key={f.name} value={f.family}>{f.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Tamaño (px)" value={v.size} min={6} max={160} step={1} onChange={(n) => onChange({size: n})} />
        <NumberInput label="Grosor" value={v.weight} min={400} max={800} step={100} onChange={(n) => onChange({weight: n})} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Interletrado (px)" value={v.letterSpacing} min={-2} max={20} step={1} onChange={(n) => onChange({letterSpacing: n})} />
        <NumberInput label="Alto de línea" value={v.lineHeight} min={0.8} max={2} step={0.1} onChange={(n) => onChange({lineHeight: n})} />
      </div>
      <ColorInput label="Color del texto" value={v.color} onChange={(c) => onChange({color: c || undefined})} />
      <div>
        <label className="text-sm font-medium mb-1 block">Mayúsculas / minúsculas</label>
        <div className="grid grid-cols-4 gap-1">
          {([
            ['none', 'Normal'],
            ['uppercase', 'MAY'],
            ['lowercase', 'min'],
            ['capitalize', 'Cap'],
          ] as const).map(([val, lab]) => (
            <button
              key={val}
              type="button"
              onClick={() => onChange({textTransform: val === 'none' ? undefined : val})}
              className={`px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${(v.textTransform ?? 'none') === val ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'}`}
            >
              {lab}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Alineación</label>
        <div className="grid grid-cols-3 gap-1">
          {([
            ['left', 'Izq'],
            ['center', 'Centro'],
            ['right', 'Der'],
          ] as const).map(([val, lab]) => (
            <button
              key={val}
              type="button"
              onClick={() => onChange({align: (v.align ?? 'left') === val ? undefined : val})}
              className={`px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${(v.align ?? 'left') === val ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'}`}
            >
              {lab}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border-subtle p-2.5 space-y-2">
        <p className="text-sm font-medium">Resaltado</p>
        <AutoColorInput
          label="Color de fondo"
          value={v.highlightColor}
          onChange={(c) => onChange({highlightColor: c || undefined})}
        />
        {v.highlightColor && (
          <SliderNumberInput
            label="Radio de esquinas (px)"
            value={v.highlightRadius ?? 0}
            min={0}
            max={48}
            step={1}
            onChange={(n) => onChange({highlightRadius: n || undefined})}
          />
        )}
      </div>
      <Toggle
        label="Subrayado"
        checked={!!v.underline}
        onChange={(b) => onChange({underline: b || undefined})}
      />
    </div>
  );
}
