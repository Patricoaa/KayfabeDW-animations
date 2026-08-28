import type {LegendPosition} from '@/lib/chart-config';

type LegendItem = {
  label: string;
  color: string;
};

const POSITION_CLASSES: Record<LegendPosition, string> = {
  top: 'flex-wrap justify-center',
  right: 'flex-col',
  bottom: 'flex-wrap justify-center',
};

export function Legend({
  items,
  position,
}: {
  items: LegendItem[];
  position: LegendPosition;
}) {
  if (items.length === 0) return null;
  return (
    <div className={`flex items-center gap-x-3 gap-y-1 ${POSITION_CLASSES[position] ?? POSITION_CLASSES.bottom} text-[10px]`}>
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{backgroundColor: it.color}}
          />
          <span className="text-secondary truncate max-w-[140px]">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
