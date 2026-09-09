import React from 'react';
import {useCurrentFrame} from 'remotion';
import type {CommonCanvasConfig} from '../../../lib/animation-config';
import {resolveGradient} from '../../../lib/chart-config';

// Full-bleed canvas background layer (solid / pattern / gradient / image),
// rendered below everything else. Matches the timeline-race background logic
// so every template paints its canvas identically. For image backgrounds an
// optional mirror animation toggles the image 180° (horizontal flip, scaleX
// −1) at precise frame intervals: normal for `backgroundAnimSpeed` frames,
// mirrored for the next `backgroundAnimSpeed` frames, and so on, looping.
export const BackgroundLayer: React.FC<CommonCanvasConfig> = ({
  backgroundType = 'color',
  background = '#0a0a0a',
  backgroundSecondary = '#1f2937',
  backgroundImage,
  backgroundPattern = 'dots',
  backgroundAngle = 135,
  backgroundGradientShape = 'linear',
  backgroundGradientCenterX = 50,
  backgroundGradientCenterY = 50,
  backgroundGradientRadius = 100,
  backgroundGradientBlend,
  backgroundGradientSmooth,
  backgroundOpacity = 1,
  backgroundBlur = 0,
  backgroundFit = 'cover',
  backgroundAnim = 'none',
  backgroundAnimSpeed = 60,
}) => {
  const frame = useCurrentFrame();

  // Discrete 180° toggle every `cycleF` frames (no easing): the pose flips
  // exactly on frame multiples. Frame 0 always starts normal.
  const mirror = backgroundType === 'image' && backgroundAnim === 'mirror';
  const cycleF = Math.max(1, Math.round(backgroundAnimSpeed));
  const scaleX = mirror && Math.floor(frame / cycleF) % 2 === 1 ? -1 : 1;

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
      const {start, end, dist, fadeEnd} = resolveGradient({
        background,
        backgroundSecondary,
        backgroundGradientBlend,
        backgroundGradientSmooth,
      });
      const stops = `${start} ${dist * 100}%, ${end} ${fadeEnd * 100}%`;
      if (backgroundGradientShape === 'radial') {
        const cx = Math.min(100, Math.max(0, backgroundGradientCenterX));
        const cy = Math.min(100, Math.max(0, backgroundGradientCenterY));
        const rad = Math.min(200, Math.max(0, backgroundGradientRadius));
        return {
          background: `radial-gradient(ellipse ${rad}% ${rad}% at ${cx}% ${cy}%, ${start} 0%, ${stops})`,
        };
      }
      return {
        background: `linear-gradient(${backgroundAngle ?? 135}deg, ${start} 0%, ${stops})`,
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
        transform: mirror && scaleX !== 1 ? `scaleX(${scaleX})` : undefined,
        opacity: backgroundOpacity ?? 1,
        filter: backgroundBlur ? `blur(${backgroundBlur}px)` : undefined,
      }}
    />
  );
};