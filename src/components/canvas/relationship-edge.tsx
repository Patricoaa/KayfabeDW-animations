'use client';

import {memo} from 'react';
import {getBezierPath} from '@xyflow/react';
import type {EdgeProps} from '@xyflow/react';

export type RelationshipKind = 'fk' | 'view';

export type RelationshipEdgeData = {
  kind: RelationshipKind;
  label?: string;
};

const STYLES: Record<RelationshipKind, {color: string; strokeDasharray: string}> = {
  fk: {color: '#64748b', strokeDasharray: '6 4'},
  view: {color: '#a855f7', strokeDasharray: '2 4'},
};

function RelationshipEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const {kind = 'fk', label = ''} = (data ?? {}) as RelationshipEdgeData;
  const style = STYLES[kind];

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke={style.color}
        strokeWidth={1.5}
        strokeDasharray={style.strokeDasharray}
        pointerEvents="none"
      />
      {label && (
        <g transform={`translate(${labelX}px,${labelY}px)`} pointerEvents="none">
          <circle r={4} fill={style.color} />
          <text
            textAnchor="start"
            x={6}
            y={3}
            fontSize={8}
            fill={style.color}
            fontFamily="JetBrains Mono, monospace"
          >
            {label}
          </text>
        </g>
      )}
    </>
  );
}

export const RelationshipEdge = memo(RelationshipEdgeComponent);
