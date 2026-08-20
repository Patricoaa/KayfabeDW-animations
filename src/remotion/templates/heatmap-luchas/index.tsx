import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';

export type HeatmapCell = {
  row: string;
  col: string;
  value: number;
};

export type HeatmapLuchasProps = {
  title: string;
  rows: string[];
  cols: string[];
  cells: HeatmapCell[];
  colorScale?: [string, string];
};

function lerpColor(a: string, b: string, t: number): string {
  const parseHex = (hex: string) => {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  };
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const blue = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${blue})`;
}

export const HeatmapLuchas: React.FC<HeatmapLuchasProps> = ({
  title,
  rows,
  cols,
  cells,
  colorScale = ['#1e293b', '#f59e0b'],
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const titleOp = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'});
  const titleY = spring({fps, frame, config: {damping: 15, stiffness: 80}}) * -20;

  const maxVal = Math.max(...cells.map((c) => c.value), 1);

  const gridOp = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cellSize = 120;
  const labelWidth = 160;
  const leftPadding = 80;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
        padding: 60,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          fontSize: 48,
          fontWeight: 800,
          color: '#ffffff',
          marginBottom: 48,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </div>

      <div style={{opacity: gridOp, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={{display: 'flex', marginBottom: 12, paddingLeft: leftPadding}}>
          {cols.map((col, ci) => {
            const colDelay = 20 + ci * 5;
            const colOp = interpolate(frame - colDelay, [0, 10], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={col}
                style={{
                  opacity: colOp,
                  width: cellSize,
                  textAlign: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#94a3b8',
                }}
              >
                {col}
              </div>
            );
          })}
        </div>

        {rows.map((row, ri) => {
          const rowDelay = 25 + ri * 8;
          const rowOp = interpolate(frame - rowDelay, [0, 12], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div key={row} style={{opacity: rowOp, display: 'flex', alignItems: 'center', marginBottom: 8}}>
              <div
                style={{
                  width: labelWidth,
                  textAlign: 'right',
                  paddingRight: 16,
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#e0e0e0',
                }}
              >
                {row}
              </div>

              {cols.map((col, ci) => {
                const cell = cells.find((c) => c.row === row && c.col === col);
                const value = cell?.value ?? 0;
                const intensity = value / maxVal;
                const cellDelay = rowDelay + ci * 3;
                const cellScale = spring({
                  fps,
                  frame: frame - cellDelay,
                  config: {damping: 12, stiffness: 80},
                });
                const cellOp = interpolate(frame - cellDelay, [0, 10], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });

                return (
                  <div
                    key={`${row}-${col}`}
                    style={{
                      opacity: cellOp,
                      transform: `scale(${cellScale})`,
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: lerpColor(colorScale[0], colorScale[1], intensity),
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 4px',
                      boxShadow: intensity > 0.7 ? `0 0 16px ${lerpColor(colorScale[0], colorScale[1], intensity)}60` : 'none',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: intensity > 0.5 ? '#000' : '#fff',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 32}}>
          <span style={{fontSize: 14, color: '#64748b'}}>0</span>
          <div
            style={{
              width: 200,
              height: 16,
              borderRadius: 8,
              background: `linear-gradient(to right, ${colorScale[0]}, ${colorScale[1]})`,
            }}
          />
          <span style={{fontSize: 14, color: '#64748b'}}>{maxVal}</span>
        </div>
      </div>
    </div>
  );
};
