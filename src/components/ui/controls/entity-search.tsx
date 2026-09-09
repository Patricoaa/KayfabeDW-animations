// Search box that filters a per-entity list by label, plus an "N de M" counter
// so it's obvious a filter is active (and how many rows matched).

export function EntitySearch({value, onChange, shown, total}: {value: string; onChange: (v: string) => void; shown: number; total: number}) {
  const active = value.trim() !== '';
  return (
    <div>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar entidad…"
          aria-label="Buscar entidad"
          className="w-full bg-elevated border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      {active && <p className="text-[10px] text-muted mt-1">{shown} de {total} entidades</p>}
    </div>
  );
}