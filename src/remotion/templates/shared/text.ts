import type React from 'react';
import type {RaceTextStyle} from '../../../lib/animation-config';

// Merge a RaceTextStyle override onto concrete defaults into a CSSProperties
// subset, dropping undefined so the default wins when not configured.
export function textStyle(over: RaceTextStyle | undefined, defaults: {color: string; size: number; weight: number}) {
  const s: React.CSSProperties = {
    color: over?.color ?? defaults.color,
    fontSize: over?.size ?? defaults.size,
    fontWeight: over?.weight ?? defaults.weight,
  };
  if (over?.fontFamily) s.fontFamily = over.fontFamily;
  if (over?.textTransform && over.textTransform !== 'none') s.textTransform = over.textTransform;
  if (over?.letterSpacing !== undefined) s.letterSpacing = over.letterSpacing;
  if (over?.lineHeight) s.lineHeight = over.lineHeight;
  if (over?.align) s.textAlign = over.align;
  if (over?.underline) s.textDecoration = 'underline';
  if (over?.highlightColor) {
    s.background = over.highlightColor;
    s.borderRadius = over.highlightRadius;
    s.display = 'inline-block';
    s.padding = '0.14em 0.22em';
  }
  if (over?.angle) {
    s.transform = `rotate(${over.angle}deg)`;
    s.transformOrigin = 'center';
  }
  return s;
}