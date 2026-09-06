import React from 'react';
import type {CommonHeaderConfig} from '../../../lib/animation-config';
import {textStyle} from './text';

// Title + subtitle block, absolutely positioned near the top-left with
// per-text style and offset overrides. `top`/`left` are the template's
// default placement; `titleX`/`titleY` (and subtitle offsets) nudge it.
export const Header: React.FC<
  CommonHeaderConfig & {
    top: number;
    left: number;
    titleSize: number;
    subSize: number;
    accentColor?: string;
    fallbackTitle?: string;
  }
> = ({
  title,
  titleX,
  titleY,
  titleText,
  subtitle,
  subtitleText,
  subtitleX,
  subtitleY,
  top,
  left,
  titleSize,
  subSize,
  accentColor = '#FFD700',
  fallbackTitle = '',
}) => (
  <div style={{position: 'absolute', top, left, zIndex: 1, transform: `translate(${titleX ?? 0}px, ${titleY ?? 0}px)`}}>
    <div style={{...textStyle(titleText, {color: '#ffffff', size: titleSize, weight: 800}), whiteSpace: 'pre-line'}}>{title || fallbackTitle}</div>
    {subtitle && (
      <div style={{marginTop: 10, transform: `translate(${subtitleX ?? 0}px, ${subtitleY ?? 0}px)`, ...textStyle(subtitleText, {color: accentColor, size: subSize, weight: 600}), whiteSpace: 'pre-line'}}>{subtitle}</div>
    )}
  </div>
);