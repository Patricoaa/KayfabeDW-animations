'use client';

import {PLATFORM_PRESETS, toCanvasMargins, type SafeZoneSettings} from '@/lib/safe-zones';

/**
 * Preview-only safe-zone layer. Rendered as a sibling of the Remotion player /
 * static chart so it can never reach the exported file (MP4 render and static
 * export read only their own refs/props). Absolute inside its parent, which
 * must be relative and overflow hidden.
 */
export function SafeZoneOverlay({
  width,
  height,
  settings,
}: {
  width: number;
  height: number;
  settings: SafeZoneSettings;
}) {
  if (!settings.visible || width <= 0 || height <= 0) return null;

  const m = toCanvasMargins(settings.margins, width, height);
  const safeW = Math.max(0, width - m.left - m.right);
  const safeH = Math.max(0, height - m.top - m.bottom);
  const platformLabel = settings.platform !== 'custom'
    ? PLATFORM_PRESETS[settings.platform].label
    : 'Personalizado';

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      <div
        className="absolute border-2 border-dashed border-white/90"
        style={{
          left: m.left,
          top: m.top,
          width: safeW,
          height: safeH,
          boxShadow: `0 0 0 9999px rgba(0,0,0,0.35)`,
        }}
      />
      <div
        className="absolute rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white"
        style={{left: m.left + 2, top: m.top + 2}}
      >
        {platformLabel} · {safeW}×{safeH}
      </div>
    </div>
  );
}