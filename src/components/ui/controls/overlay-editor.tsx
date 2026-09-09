import type {ChartOverlay, OverlayShapeType, TextLayout, TextAlign} from '@/lib/chart-config';
import {NumberControl} from './number-control';
import {ColorPickerControl} from './color-picker-control';
import {AutoColorInput} from './auto-color-input';
import {FileUploadInput} from './file-upload-input';
import {SelectControl} from './select-control';
import {TextStyleControls} from './text-style-controls';

export type OverlayEditorVariant = 'static' | 'animation';

type OverlayEditorProps = {
  overlay: ChartOverlay;
  index: number;
  variant: OverlayEditorVariant;
  onPatch: (patch: Partial<ChartOverlay>) => void;
  onRemove: () => void;
};

const SHAPE_TYPES: {value: OverlayShapeType; label: string}[] = [
  {value: 'rect', label: 'Rectángulo'},
  {value: 'circle', label: 'Círculo / Óvalo'},
  {value: 'line', label: 'Línea'},
];

const Z_OPTIONS: {value: 'front' | 'back'; label: string}[] = [
  {value: 'front', label: 'Al frente'},
  {value: 'back', label: 'Detrás (Fondo)'},
];

const chipClass = (active: boolean) =>
  `flex-1 px-1.5 py-1 rounded text-[10px] font-medium transition-colors ${
    active ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover'
  }`;

// Full text-block placement used by the static panel (free coordinates on the
// canvas + optional background box). Mirrors the shared LayoutControls.
function FullTextLayout({value, onChange}: {value?: TextLayout; onChange: (patch: Partial<TextLayout>) => void}) {
  return (
    <div className="pt-3 border-t border-border-subtle">
      <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Posición (px)</label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm font-medium mb-1 block">Ancla</label>
          <SelectControl
            value={value?.anchor ?? 'center'}
            onChange={(e) => onChange({anchor: e.target.value as TextLayout['anchor']})}
            className="w-full bg-elevated border border-border-default rounded-lg px-2 py-1 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="left">Izquierda</option>
            <option value="center">Centro</option>
            <option value="right">Derecha</option>
          </SelectControl>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Alineación</label>
          <SelectControl
            value={value?.align ?? 'center'}
            onChange={(e) => onChange({align: e.target.value as TextAlign})}
            className="w-full bg-elevated border border-border-default rounded-lg px-2 py-1 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="left">Izquierda</option>
            <option value="center">Centro</option>
            <option value="right">Derecha</option>
          </SelectControl>
        </div>
        <NumberControl label="X (px)" value={value?.x} onChange={(v) => onChange({x: v})} />
        <NumberControl label="Y (px)" value={value?.y} onChange={(v) => onChange({y: v})} />
        <NumberControl label="Rotación (°)" value={value?.rotation} min={-180} max={180} onChange={(v) => onChange({rotation: v})} />
        <NumberControl label="Espaciado (px)" value={value?.letterSpacing} min={-4} max={20} step={0.5} onChange={(v) => onChange({letterSpacing: v})} />
        <NumberControl label="Opacidad" value={value?.opacity} min={0} max={1} step={0.05} onChange={(v) => onChange({opacity: v})} />
        <NumberControl label="Alto línea" value={value?.lineHeight} min={0} max={80} step={0.5} onChange={(v) => onChange({lineHeight: v})} />
        <div className="col-span-2">
          <label className="text-sm font-medium mb-1 block">Color de fondo (caja)</label>
          <input
            type="color"
            value={value?.bgColor ?? '#000000'}
            onChange={(e) => onChange({bgColor: e.target.value})}
            className="w-10 h-8 rounded cursor-pointer border border-border-default bg-transparent"
            aria-label="Color de fondo del texto"
          />
        </div>
        <NumberControl label="Padding caja" value={value?.bgPadding} min={0} max={40} onChange={(v) => onChange({bgPadding: v})} />
        <NumberControl label="Radio caja" value={value?.bgRadius} min={0} max={40} onChange={(v) => onChange({bgRadius: v})} />
        <NumberControl label="Opac. caja" value={value?.bgOpacity} min={0} max={1} step={0.05} onChange={(v) => onChange({bgOpacity: v})} />
      </div>
    </div>
  );
}

// Compact placement (X / Y / Rotación) used by the animated templates.
function CompactPosition({value, onChange}: {value?: TextLayout; onChange: (patch: Partial<TextLayout>) => void}) {
  return (
    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border-subtle">
      <p className="text-sm font-medium col-span-2">Posición (px)</p>
      <NumberControl label="X (px)" value={value?.x} onChange={(v) => onChange({x: v})} />
      <NumberControl label="Y (px)" value={value?.y} onChange={(v) => onChange({y: v})} />
      <NumberControl label="Rotación (°)" value={value?.rotation} min={-180} max={180} onChange={(v) => onChange({rotation: v})} />
    </div>
  );
}

// Per-overlay editor shared by the static chart panel and the animated
// templates. Keeps the layer ordering/opacity/blur row on top and groups the
// type-specific controls (text / shape / image) into focused cards.
export function OverlayEditor({overlay: ov, index, variant, onPatch, onRemove}: OverlayEditorProps) {
  const typeLabel = ov.type === 'shape' ? `Forma (${ov.shape ?? 'rect'})` : ov.type === 'image' ? 'Imagen' : 'Texto';
  const patchLayout = (p: Partial<TextLayout>) => onPatch({layout: {...(ov.layout ?? {}), ...p}});
  const setAssigned = (p: Partial<ChartOverlay>) => onPatch(p);

  return (
    <div className="rounded-lg border border-border-subtle p-2.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-secondary uppercase tracking-widest font-display">
          {typeLabel} {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted hover:text-red-500 text-xs"
          aria-label="Eliminar adicional"
        >
          ✕
        </button>
      </div>

      {/* Controles comunes: Capa / Orden, Opacidad y Blur */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-subtle">
        <div>
          <label className="text-xs font-medium mb-1 block">Capa / Posición</label>
          <div className="flex gap-1">
            {Z_OPTIONS.map((z) => (
              <button
                key={z.value}
                type="button"
                onClick={() => setAssigned({zIndex: z.value})}
                className={chipClass((ov.zIndex ?? 'front') === z.value)}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <NumberControl
            label="Opacidad"
            value={ov.opacity ?? ov.layout?.opacity ?? 1}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setAssigned({opacity: v, layout: {...(ov.layout ?? {}), opacity: v}})}
          />
          <NumberControl
            label="Blur (px)"
            value={ov.blur ?? 0}
            min={0}
            max={40}
            step={1}
            onChange={(v) => setAssigned({blur: v})}
          />
        </div>
      </div>

      {ov.type === 'text' ? (
        <>
          <textarea
            value={ov.text ?? ''}
            onChange={(e) => setAssigned({text: e.target.value})}
            rows={2}
            placeholder="Texto"
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <TextStyleControls
              label={variant === 'animation' ? 'Texto' : undefined}
              value={ov.font}
              onChange={(patch) => setAssigned({font: {...(ov.font ?? {}), ...patch}})}
              showOverflow={variant === 'static'}
              showTextTransform={variant === 'animation'}
              showSpacing={variant === 'animation'}
              showHighlight={variant === 'animation'}
              showUnderline={variant === 'animation'}
              maxSize={variant === 'animation' ? 160 : 40}
            />
            <div className="space-y-2">
              {variant === 'static' ? (
                <>
                  <FullTextLayout value={ov.layout} onChange={patchLayout} />
                  <NumberControl label="Ancho máx. (px)" value={ov.maxWidth} min={0} max={2000} onChange={(v) => setAssigned({maxWidth: v})} />
                </>
              ) : (
                <CompactPosition value={ov.layout} onChange={patchLayout} />
              )}
            </div>
          </div>
        </>
      ) : ov.type === 'shape' ? (
        <>
          <div>
            <label className="text-xs font-medium mb-1 block">Tipo de Forma</label>
            <div className="flex gap-1">
              {SHAPE_TYPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setAssigned({shape: s.value})}
                  className={chipClass((ov.shape ?? 'rect') === s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {variant === 'animation' ? (
              <>
                <AutoColorInput label="Relleno / Color" value={ov.fill ?? '#f59e0b'} onChange={(v) => setAssigned({fill: v || undefined})} />
                <AutoColorInput label="Color de borde" value={ov.stroke ?? ''} onChange={(v) => setAssigned({stroke: v || 'none'})} />
              </>
            ) : (
              <>
                <ColorPickerControl label="Relleno / Color" value={ov.fill ?? '#f59e0b'} onChange={(v) => setAssigned({fill: v})} />
                <ColorPickerControl label="Color de borde" value={ov.stroke ?? ''} onChange={(v) => setAssigned({stroke: v || 'none'})} />
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberControl label="X (px)" value={ov.x} onChange={(x) => setAssigned({x})} />
            <NumberControl label="Y (px)" value={ov.y} onChange={(y) => setAssigned({y})} />
            <NumberControl label="Ancho (px)" value={ov.width} min={0} max={2000} onChange={(w) => setAssigned({width: w})} />
            <NumberControl label="Alto (px)" value={ov.height} min={0} max={2000} onChange={(h) => setAssigned({height: h})} />
            {ov.shape === 'rect' && (
              <NumberControl label="Radio esquinas" value={ov.radius} min={0} max={100} onChange={(r) => setAssigned({radius: r})} />
            )}
            <NumberControl label="Grosor borde" value={ov.strokeWidth} min={0} max={20} onChange={(w) => setAssigned({strokeWidth: w})} />
            <NumberControl label="Rotación (°)" value={ov.rotation} min={-180} max={180} onChange={(r) => setAssigned({rotation: r})} />
          </div>
        </>
      ) : (
        <>
          {variant === 'animation' ? (
            <FileUploadInput
              label="Imagen de la capa"
              value={ov.src}
              onLoad={(dataUrl) => setAssigned({src: dataUrl})}
              onClear={() => setAssigned({src: undefined})}
            />
          ) : (
            <input
              type="text"
              value={ov.src ?? ''}
              onChange={(e) => setAssigned({src: e.target.value})}
              placeholder="URL de la imagen"
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <NumberControl label="X (px)" value={ov.x} onChange={(x) => setAssigned({x})} />
            <NumberControl label="Y (px)" value={ov.y} onChange={(y) => setAssigned({y})} />
            <NumberControl label="Ancho (px)" value={ov.width} min={0} max={2000} onChange={(w) => setAssigned({width: w})} />
            <NumberControl label="Alto (px)" value={ov.height} min={0} max={2000} onChange={(h) => setAssigned({height: h})} />
            <NumberControl label="Rotación (°)" value={ov.rotation} min={-180} max={180} onChange={(r) => setAssigned({rotation: r})} />
          </div>
        </>
      )}
    </div>
  );
}