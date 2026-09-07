import React from 'react';
import {Img, staticFile} from 'remotion';
import {avatarCropRect} from '../../../lib/animation-config';

export type AvatarCrop = {zoom?: number; focusX?: number; focusY?: number};

export const Avatar: React.FC<{
  src: string;
  size?: number;
  shape?: 'circle' | 'rounded';
  radius?: number;
  crop?: AvatarCrop;
}> = ({src, size = 44, shape = 'circle', radius, crop}) => {
  const imgSrc = src.startsWith('/') && !src.startsWith('//') ? staticFile(src) : src;
  const rect = avatarCropRect(crop?.zoom, crop?.focusX, crop?.focusY, size);
  const imgX = -rect.w / 2 + rect.dx;
  const imgY = -rect.h / 2 + rect.dy;
  const borderRadius = shape === 'circle' ? '50%' : `${radius ?? Math.round(size * 0.25)}px`;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        overflow: 'hidden',
        flexShrink: 0,
        backgroundColor: '#1f2937',
        position: 'relative',
      }}
    >
      <Img
        src={imgSrc}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: rect.w,
          height: rect.h,
          transform: `translate(${imgX}px, ${imgY}px)`,
          objectFit: 'contain',
          borderRadius,
        }}
      />
    </div>
  );
};