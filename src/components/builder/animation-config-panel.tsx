'use client';

import React, {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import type {ColumnMeta} from '@/components/builder/chart-config-panel';
import type {TimelineRaceConfig, DateFormat, AvatarShape, AvatarCrop, RaceTextStyle} from '@/lib/animation-config';
import {avatarCropRect} from '@/lib/animation-config';
import {FONT_PRESETS} from '@/lib/chart-config';

type Participant = {label: string; image?: string | null};

type AnimationConfigPanelProps = {
  templateId: string;
  columns: string[];
  fieldMeta: ColumnMeta[];
  value: TimelineRaceConfig;
  onChange: (next: TimelineRaceConfig) => void;
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

// Renders per-template column config. Currently only Timeline Race has an
// explicit config UI; other templates inherit the static xField/yField mapping.
export function AnimationConfigPanel({templateId, columns, fieldMeta, value, onChange, participants = []}: AnimationConfigPanelProps) {
  if (templateId !== 'timeline-race') return null;

  const update = (patch: Partial<TimelineRaceConfig>) => onChange({...value, ...patch});
  const fmt = (value.dateFormat ?? 'day') as DateFormat;
  const setCrop = (label: string, patch?: Partial<AvatarCrop>) => {
    const next = {...(value.avatarCrops ?? {})};
    if (patch) next[label] = {...(next[label] ?? {}), ...patch};
    else delete next[label];
    update({avatarCrops: next});
  };
  const setBarColor = (label: string, color?: string) => {
    const next = {...(value.barColors ?? {})};
    if (color) next[label] = color;
    else delete next[label];
    update({barColors: next});
  };
  const setRowOrder = (order: ('bar' | 'avatar')[]) => update({rowOrder: order});

  return (
    <div className="space-y-3">
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
      </Section>

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

      {/* ============ AVATAR ============ */}
      <Section title="Avatar">
        <div>
          <label className="text-sm font-medium mb-1 block">Tamaño</label>
          <input
            type="number"
            min={16}
            max={160}
            step={2}
            value={value.avatarSize ?? ''}
            onChange={(e) => update({avatarSize: e.target.value ? Number(e.target.value) : undefined})}
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
                onClick={() => update({avatarShape: s as AvatarShape})}
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
          <NumberInput label="Radio de esquina (vacío = auto)" value={value.avatarRadius} min={0} max={60} step={1} onChange={(v) => update({avatarRadius: v})} />
        )}
        {participants.length > 0 && (
          <div className="pt-2 border-t border-border-subtle">
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-sm font-medium block">Ajustar por entidad</label>
              {Object.keys(value.avatarCrops ?? {}).length > 0 && (
                <button type="button" onClick={() => update({avatarCrops: undefined})} className="text-[10px] text-muted hover:text-red-500">
                  Limpiar todas
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted mb-1.5">Zoom y foco del recorte dentro del marco de cada avatar.</p>
            <div className="space-y-2">
              {participants.map((p) => {
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
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-sm font-medium block">Colores por entidad</label>
            {Object.keys(value.barColors ?? {}).length > 0 && (
              <button type="button" onClick={() => update({barColors: undefined})} className="text-[10px] text-muted hover:text-red-500">
                Limpiar todos
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted mb-1.5">Personaliza el color de la barra de cada entidad. Dejar vacío usa el color por defecto.</p>
          <div className="space-y-1.5">
            {participants.map((p) => {
              const color = value.barColors?.[p.label] ?? '#3f3f46';
              return (
                <div key={p.label} className="flex items-center gap-2">
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

      {/* ============ CANVAS ============ */}
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
          onChange={(v) => update({backgroundType: v as TimelineRaceConfig['backgroundType']})}
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
              onChange={(v) => update({backgroundPattern: v as TimelineRaceConfig['backgroundPattern']})}
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
              onChange={(v) => update({backgroundFit: v as TimelineRaceConfig['backgroundFit']})}
            />
            <ColorInput label="Color base (debajo)" value={value.background ?? '#0a0a0a'} onChange={(v) => update({background: v || undefined})} />
            <SliderNumberInput label="Opacidad (%)" value={Math.round((value.backgroundOpacity ?? 1) * 100)} min={0} max={100} step={5} onChange={(v) => update({backgroundOpacity: v ? v / 100 : undefined})} />
          </>
        )}

        <SliderNumberInput label="Desenfoque del fondo (blur px)" value={value.backgroundBlur ?? 0} min={0} max={30} step={1} onChange={(v) => update({backgroundBlur: v || undefined})} />
      </Section>
    </div>
  );
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
    </div>
  );
}
