'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {toggleHidden, toggleLocked, getHiddenElements, isLocked} from './element-handlers';

type ElementDef = {
  id: string;
  label: string;
  icon: string;
};

const CORE_ELEMENTS: ElementDef[] = [
  {id: 'title', label: 'Título', icon: '📌'},
  {id: 'subtitle', label: 'Subtítulo', icon: '📝'},
  {id: 'legend', label: 'Leyenda', icon: '📋'},
  {id: 'xLabel', label: 'Etiqueta X', icon: '➖'},
  {id: 'yLabel', label: 'Etiqueta Y', icon: '垂直'},
];

type Props = {
  config: ChartConfig;
  onConfigChange: (patch: Partial<ChartConfig>) => void;
  activeElement: string | null;
  onSelectElement: (id: string | null) => void;
};

export function ElementsPanel({config, onConfigChange, activeElement, onSelectElement}: Props) {
  const hidden = getHiddenElements(config);

  const elements = CORE_ELEMENTS;

  return (
    <div className="border border-border rounded-md bg-surface">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Elementos</span>
      </div>
      <ul className="divide-y divide-border">
        {elements.map((el) => {
          const isActive = activeElement === el.id;
          const isHidden = hidden.includes(el.id);
          const isElementLocked = isLocked(config, el.id);
          return (
            <li key={el.id}>
              <button
                type="button"
                onClick={() => onSelectElement(isActive ? null : el.id)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors ${
                  isActive ? 'bg-accent/10 text-accent' : 'hover:bg-accent/5 text-fg'
                }`}
              >
                <span className="text-base leading-none">{el.icon}</span>
                <span className="flex-1 truncate">{el.label}</span>
                <button
                  type="button"
                  title={isHidden ? 'Mostrar' : 'Ocultar'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfigChange(toggleHidden(config, el.id));
                  }}
                  className={`p-0.5 rounded text-xs transition-colors ${
                    isHidden ? 'text-muted hover:text-fg' : 'text-muted hover:text-fg'
                  }`}
                >
                  {isHidden ? '👁' : '👁‍🗨'}
                </button>
                <button
                  type="button"
                  title={isElementLocked ? 'Desbloquear' : 'Bloquear'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfigChange(toggleLocked(config, el.id));
                  }}
                  className={`p-0.5 rounded text-xs transition-colors ${
                    isElementLocked ? 'text-orange-500 hover:text-orange-600' : 'text-muted hover:text-fg'
                  }`}
                >
                  {isElementLocked ? '🔒' : '🔓'}
                </button>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
