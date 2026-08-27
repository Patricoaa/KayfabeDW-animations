'use client';

import {memo} from 'react';
import {getBezierPath, EdgeLabelRenderer} from '@xyflow/react';
import type {EdgeProps} from '@xyflow/react';

export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';

export type JoinEdgeData = {
  joinType: JoinType;
  condition: string;
  onEdit?: (edgeId: string) => void;
};

const JOIN_COLORS: Record<JoinType, string> = {
  INNER: '#3b82f6',
  LEFT: '#f97316',
  RIGHT: '#22c55e',
  FULL: '#a855f7',
};

function JoinEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps) {
  const {joinType = 'INNER', condition = '', onEdit} = (data ?? {}) as JoinEdgeData;
  const color = JOIN_COLORS[joinType] ?? '#3b82f6';

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
        stroke={color}
        strokeWidth={2}
        className="transition-all"
        style={style}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="group"
        >
          <button
            onClick={() => onEdit?.(id ?? '')}
            className="px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-all hover:scale-105"
            style={{
              backgroundColor: `${color}20`,
              borderColor: `${color}60`,
              color: color,
            }}
          >
            {joinType}
            {condition && (
              <span className="ml-1 opacity-60 truncate max-w-[100px] inline-block">
                {condition}
              </span>
            )}
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const JoinEdge = memo(JoinEdgeComponent);
