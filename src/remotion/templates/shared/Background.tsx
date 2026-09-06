import React from 'react';
import type {CommonCanvasConfig} from '../../../lib/animation-config';

// Full-bleed canvas background layer (solid / pattern / gradient / image),
// rendered below everything else. Matches the timeline-race background logic
// so every template paints its canvas identically.
export const BackgroundLayer: React.FC<CommonCanvasConfig> = ({
  backgroundType = 'color',
  background = '#0a0a0a',
  backgroundSecondary = '#1f2937',
  backgroundImage,
  backgroundPattern = 'dots',
  backgroundAngle = 135,
  backgroundOpacity = 1,
  backgroundBlur = 0,
  backgroundFit = 'cover',
}) => {
  const bgStyle: React.CSSProperties = (() => {
    let img: string | undefined;
    if (backgroundType === 'color') {
      return {backgroundColor: background};
    }
    if (backgroundType === 'image' && backgroundImage) {
      img = backgroundImage;
      const size =
        backgroundFit === 'contain' ? 'contain' : backgroundFit === 'fill' ? '100% 100%' : 'cover';
      return {
        backgroundColor: background,
        backgroundImage: `url(${img})`,
        backgroundSize: size,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    if (backgroundType === 'gradient') {
      return {
        background: `linear-gradient(${backgroundAngle ?? 135}deg, ${background}, ${backgroundSecondary ?? '#1f2937'})`,
      };
    }
    // pattern
    const fg = background;
    if (backgroundPattern === 'dots') {
      return {
        backgroundColor: '#000',
        backgroundImage: `radial-gradient(${fg} 22%, transparent 24%)`,
        backgroundSize: '26px 26px',
        backgroundPosition: '0 0',
      };
    }
    if (backgroundPattern === 'grid') {
      return {
        backgroundColor: '#000',
        backgroundImage: `linear-gradient(${fg} 1px, transparent 1px), linear-gradient(90deg, ${fg} 1px, transparent 1px)`,
        backgroundSize: '26px 26px',
      };
    }
    if (backgroundPattern === 'checkers') {
      return {
        backgroundColor: '#000',
        backgroundImage: `linear-gradient(45deg, ${fg} 25%, transparent 25%, transparent 75%, ${fg} 75%), linear-gradient(45deg, ${fg} 25%, transparent 25%, transparent 75%, ${fg} 75%)`,
        backgroundSize: '26px 26px',
        backgroundPosition: '0 0, 13px 13px',
      };
    }
    // stripes
    return {
      backgroundColor: '#000',
      backgroundImage: `repeating-linear-gradient(${backgroundAngle ?? 45}deg, ${fg} 0 10px, transparent 10px 22px)`,
    };
  })();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        ...bgStyle,
        opacity: backgroundOpacity ?? 1,
        filter: backgroundBlur ? `blur(${backgroundBlur}px)` : undefined,
      }}
    />
  );
};