import React from 'react';
import {useVideoConfig} from 'remotion';
import type {ChartOverlay} from '../../../lib/chart-config';

// Free-form overlays (text/image/shape) drawn on top of the whole composition,
// mirroring the static `ChartOverlays` (front/back layering). Coordinates are
// authored in the static chart design space (config.width x config.height) and
// scaled proportionally into the actual composition size so overlays keep their
// relative placement across every export preset.
export type OverlaysProps = {
  overlays?: ChartOverlay[];
  designWidth?: number;
  designHeight?: number;
  zIndexFilter?: 'front' | 'back';
};

function hexToRgba(hex: string, alpha: number): string {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const Overlays: React.FC<OverlaysProps> = ({
  overlays = [],
  designWidth = 1080,
  designHeight = 1920,
  zIndexFilter,
}) => {
  const {width: W, height: H} = useVideoConfig();

  if (!overlays || overlays.length === 0) return null;

  const filtered = zIndexFilter
    ? overlays.filter((o) => (o.zIndex ?? 'front') === zIndexFilter)
    : overlays;
  if (filtered.length === 0) return null;

  const sx = W / Math.max(1, designWidth || W);
  const sy = H / Math.max(1, designHeight || H);

  const blurStyle = (blur: number | undefined): React.CSSProperties | undefined =>
    blur && blur > 0 ? {filter: `blur(${blur * sy}px)`} : undefined;

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'}}>
      {filtered.map((o) => {
        if (o.type === 'shape') {
          const w = (o.width ?? 60) * sx;
          const h = (o.height ?? 60) * sy;
          const x = (o.x ?? 0) * sx;
          const y = (o.y ?? 0) * sy;
          const rot = o.rotation ?? 0;
          const stroke = o.stroke ?? 'none';
          const strokeW = (o.strokeWidth ?? 0) * sx;
          const opacity = o.opacity ?? 1;
          const rotate = rot ? `rotate(${rot}deg)` : undefined;
          const border = stroke !== 'none' && stroke !== '' ? `${strokeW}px solid ${stroke}` : undefined;

          if (o.shape === 'circle') {
            return (
              <div
                key={o.id}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: w,
                  height: h,
                  borderRadius: '50%',
                  backgroundColor: o.fill ?? '#f59e0b',
                  border,
                  transform: rotate,
                  transformOrigin: `${w / 2}px ${h / 2}px`,
                  opacity,
                  ...blurStyle(o.blur),
                }}
              />
            );
          }

          if (o.shape === 'line') {
            const len = Math.sqrt(w * w + h * h);
            const ang = (Math.atan2(h, w) * 180) / Math.PI;
            const thick = Math.max(2, (o.strokeWidth ?? 2) * sx);
            const cx = x + w / 2;
            const cy = y + h / 2;
            return (
              <div
                key={o.id}
                style={{
                  position: 'absolute',
                  left: cx - len / 2,
                  top: cy - thick / 2,
                  width: len,
                  height: thick,
                  backgroundColor: o.fill ?? '#f59e0b',
                  transform: `rotate(${ang + rot}deg)`,
                  transformOrigin: '50% 50%',
                  opacity,
                  ...blurStyle(o.blur),
                }}
              />
            );
          }

          return (
            <div
              key={o.id}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: w,
                height: h,
                backgroundColor: o.fill ?? '#f59e0b',
                borderRadius: (o.radius ?? 0) * sx,
                border,
                transform: rotate,
                transformOrigin: `${w / 2}px ${h / 2}px`,
                opacity,
                ...blurStyle(o.blur),
              }}
            />
          );
        }

        if (o.type === 'image') {
          const w = (o.width ?? 0) * sx;
          const h = (o.height ?? 0) * sy;
          const x = (o.x ?? 0) * sx;
          const y = (o.y ?? 0) * sy;
          const rot = o.rotation ?? 0;
          const opacity = o.opacity ?? 1;
          const rotate = rot ? `rotate(${rot}deg)` : undefined;
          const transformOrigin = `${w / 2}px ${h / 2}px`;

          if (!o.src || w <= 0 || h <= 0) {
            return (
              <div
                key={o.id}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: w,
                  height: h,
                  border: '1.5px dashed #f59e0b',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                  fontSize: 11,
                  transform: rotate,
                  transformOrigin,
                  opacity,
                  ...blurStyle(o.blur),
                }}
              >
                {o.src ? 'Cargando…' : 'Sin imagen'}
              </div>
            );
          }

          return (
            <div
              key={o.id}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: w,
                height: h,
                transform: rotate,
                transformOrigin,
                opacity,
                ...blurStyle(o.blur),
              }}
            >
              <img src={o.src} alt="" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
            </div>
          );
        }

        const text = o.text ?? '';
        if (!text) return null;

        const layout = o.layout ?? {};
        const size = o.font?.size ?? 14;
        const weight = o.font?.weight ?? 400;
        const color = layout.color ?? o.font?.color ?? '#ffffff';
        const align = o.font?.align ?? layout.align ?? 'left';
        const anchor = layout.anchor ?? 'left';
        const x = layout.x ?? 0;
        const y = layout.y ?? 0;
        const rot = layout.rotation ?? 0;
        const opacity = layout.opacity ?? o.opacity ?? 1;
        const lineH = layout.lineHeight !== undefined ? `${Math.round(layout.lineHeight * sy)}px` : undefined;
        const maxW = o.maxWidth && o.maxWidth > 0 ? o.maxWidth : undefined;
        const pad = layout.bgPadding ?? 4;

        const pos: React.CSSProperties = {top: y * sy};
        if (anchor === 'right') {
          pos.right = x * sx;
        } else if (anchor === 'center') {
          pos.left = W / 2 + x * sx;
        } else {
          pos.left = x * sx;
        }
        const transformOrigin = anchor === 'center' ? '50% 0' : anchor === 'right' ? '100% 0' : '0 0';
        const transform = [anchor === 'center' ? 'translateX(-50%)' : '', rot ? `rotate(${rot}deg)` : '']
          .filter(Boolean)
          .join(' ');

        return (
          <div
            key={o.id}
            style={{
              position: 'absolute',
              ...pos,
              transform: transform || undefined,
              transformOrigin,
              opacity,
              ...blurStyle(o.blur),
              ...(layout.bgColor
                ? {
                    backgroundColor: hexToRgba(layout.bgColor, layout.bgOpacity ?? 1),
                    padding: `${Math.max(0, pad * sy)}px`,
                    borderRadius: (layout.bgRadius ?? 4) * sx,
                  }
                : {}),
            }}
          >
            <div
              style={{
                color,
                fontFamily: o.font?.fontFamily,
                fontSize: size * sy,
                fontWeight: weight,
                textAlign: align,
                whiteSpace: 'pre-wrap',
                lineHeight: lineH,
                letterSpacing: layout.letterSpacing !== undefined ? `${layout.letterSpacing * sx}px` : o.font?.letterSpacing !== undefined ? `${o.font.letterSpacing * sx}px` : undefined,
                textTransform: o.font?.textTransform !== 'none' ? o.font?.textTransform : undefined,
                textDecoration: o.font?.underline ? 'underline' : undefined,
                maxWidth: maxW ? maxW * sx : undefined,
              }}
            >
              {text}
            </div>
          </div>
        );
      })}
    </div>
  );
};