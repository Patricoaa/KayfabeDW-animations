'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {prepareFaceOff, resolveChartStyle, formatValue, type FaceOffEntity, type FaceOffTile} from '@/lib/chart-data';
import {
  Zone,
  SvgHeader,
  ChartOverlays,
  frameRect,
  headerHeight,
  nextSvgId,
} from './chart-frame';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Foto de entidad: imagen recortada por una clipPath con la forma configurada
// (rounded/circle). Sin crop: el SVG image preserva aspecto con `meet`.
function Photo({
  href, cx, cy, clipId, shape, size, radius, borderColor, borderWidth,
}: {
  href: string; cx: number; cy: number; clipId: string;
  shape: string | undefined; size: number; radius: number;
  borderColor?: string; borderWidth?: number;
}) {
  const bw = borderWidth ?? 0;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          {shape === 'circle' ? (
            <circle cx={cx} cy={cy} r={size / 2} />
          ) : (
            <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} rx={radius} />
          )}
        </clipPath>
      </defs>
      <image
        href={href}
        x={cx - size / 2}
        y={cy - size / 2}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        clipPath={`url(#${clipId})`}
      />
      {bw > 0 && borderColor && (
        shape === 'circle'
          ? <circle cx={cx} cy={cy} r={size / 2} fill="none" stroke={borderColor} strokeWidth={bw} />
          : <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} rx={radius} fill="none" stroke={borderColor} strokeWidth={bw} />
      )}
    </g>
  );
}

// Ancho aproximado de un texto (factor 0.55·fontSize por carácter, igual que
// el header). Se usa para truncar nombres de entidad que no caben en su mitad.
const textW = (s: string, fs: number) => s.length * fs * 0.55;
const truncateTo = (s: string, fs: number, maxW: number): string => {
  if (textW(s, fs) <= maxW) return s;
  let out = s;
  while (out.length > 1 && textW(out + '…', fs) > maxW) out = out.slice(0, -1);
  return out + '…';
};

function TileMosaic({
  entity, tiles, x, y, tileW, tileH, cols, gap, st, config,
}: {
  entity: FaceOffEntity; tiles: FaceOffTile[]; x: number; y: number;
  tileW: number; tileH: number; cols: number; gap: number;
  st: ReturnType<typeof resolveChartStyle>; config: ChartConfig;
}) {
  const iconSize = config.faceIconSize ?? 18;
  const radius = config.faceTileRadius ?? 8;
  const numFmt = config.numberFormat ?? 'short';
  const valueSize = config.dataLabelFont?.size ?? config.dataLabelFontSize ?? 11;
  const titleSize = config.dataLabelFont?.size ?? config.dataLabelFontSize ?? 11;
  const family = config.dataLabelFont?.fontFamily ?? st.fontFamily;
  const valueColor = config.dataLabelColor ?? st.textColor;
  const accent = entity.accent;
  const valueWeight = config.dataLabelFont?.weight ?? 700;
  const titleWeight = 400;

  return (
    <g>
      {tiles.map((t, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const tx = x + col * (tileW + gap);
        const ty = y + row * (tileH + gap);
        // Icono anclado arriba, título bajo el icono, valor al fondo del tile.
        const titleY = ty + 8 + iconSize + 3;
        const valueY = ty + tileH - 6;
        return (
          <g key={i}>
            <rect
              x={tx}
              y={ty}
              width={tileW}
              height={tileH}
              rx={radius}
              fill={accent}
              opacity={0.08}
            />
            <rect
              x={tx}
              y={ty}
              width={tileW}
              height={tileH}
              rx={radius}
              fill="none"
              stroke={accent}
              strokeWidth={1}
              opacity={0.25}
            />
            <image
              href={t.icon}
              x={tx + tileW / 2 - iconSize / 2}
              y={ty + 8}
              width={iconSize}
              height={iconSize}
              preserveAspectRatio="xMidYMid meet"
            />
            <text
              x={tx + tileW / 2}
              y={titleY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={titleSize}
              fontWeight={titleWeight}
              fill={st.textColor}
              fontFamily={family}
            >
              {truncateTo(t.title, titleSize, tileW - 4)}
            </text>
            <text
              x={tx + tileW / 2}
              y={valueY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={valueSize + 1}
              fontWeight={valueWeight}
              fill={valueColor}
              fontFamily={family}
            >
              {formatValue(t.value, numFmt)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// Coloca una entidad completa (foto + nombre + mosaico) dentro de su banda.
function EntityColumn({
  entity, cx, plotTop, plotBottom, sideW, config, st, photoClipId,
}: {
  entity: FaceOffEntity; cx: number; plotTop: number; plotBottom: number; sideW: number;
  config: ChartConfig; st: ReturnType<typeof resolveChartStyle>; photoClipId: string;
}) {
  const photoSize = config.facePhotoSize ?? 72;
  const photoShape = config.facePhotoShape ?? 'rounded';
  const photoRadius = config.facePhotoRadius ?? 12;
  const gap = config.faceTileGap ?? 6;
  const cols = clamp(config.faceTileColumns ?? 2, 1, 4);
  const tiles = entity.tiles;

  const plotTopSrc = plotTop;
  const nameSize = Math.max(13, config.headerFont?.size ?? st.titleFontSize);
  const nameColor = config.headerFont?.color ?? st.textColor;
  const nameFamily = config.headerFont?.fontFamily ?? st.fontFamily;
  const nameWeight = config.headerFont?.weight ?? 700;

  const photoCy = plotTopSrc + photoSize / 2;
  const nameCy = photoCy + photoSize / 2 + 8 + nameSize / 2;
  const tilesY = nameCy + nameSize / 2 + 10;
  const tilesBottom = plotBottom;

  const colsW = sideW;
  const tileW = (colsW - gap * (cols - 1)) / cols;
  const rows = Math.max(1, Math.ceil(tiles.length / cols));
  const availH = Math.max(24, tilesBottom - tilesY);
  const tileH = clamp((availH - gap * (rows - 1)) / rows, 20, 80);
  // Ajusta las filas al alto disponible sin dejar espacio muerto: si la fila
  // completa (row height) sobra, las tiles crecen hasta llenar la banda.
  const usedRows = Math.max(1, Math.floor((availH + gap) / (tileH + gap)));

  return (
    <g>
      {entity.image ? (
        <Photo
          href={entity.image}
          cx={cx}
          cy={photoCy}
          clipId={photoClipId}
          shape={photoShape}
          size={photoSize}
          radius={photoRadius}
          borderColor={config.avatarBorderColor}
          borderWidth={config.avatarBorderWidth}
        />
      ) : (
        // Placeholder: círculo neutro con las iniciales de la entidad.
        <g>
          <circle
            cx={cx}
            cy={photoCy}
            r={photoSize / 2}
            fill={entity.accent}
            opacity={0.18}
          />
          <text
            x={cx}
            y={photoCy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.max(10, photoSize * 0.32)}
            fontWeight={700}
            fill={st.textColor}
          >
            {entity.name.slice(0, 1).toUpperCase()}
          </text>
        </g>
      )}
      <text
        x={cx}
        y={nameCy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={nameSize}
        fontWeight={nameWeight}
        fill={nameColor}
        fontFamily={nameFamily}
      >
        {truncateTo(entity.name, nameSize, sideW - 8)}
      </text>
      {tiles.length > 0 && (
        <TileMosaic
          entity={entity}
          tiles={tiles.slice(0, cols * usedRows)}
          x={cx - sideW / 2}
          y={tilesY}
          tileW={tileW}
          tileH={tileH}
          cols={cols}
          gap={gap}
          st={st}
          config={config}
        />
      )}
    </g>
  );
}

export function FaceOffChart({data, config}: Props) {
  const entities = prepareFaceOff(data, config);
  const st = resolveChartStyle(config.style);
  const width = config.width ?? 600;
  const height = config.height ?? 380;
  const headerH = headerHeight(config, st, width);
  const sp = config.spacing ?? {};
  // Faceoff no tiene ejes: los márgenes laterales (por defecto asimétricos
  // para el eje Y de barras) se promedian para que el divisor caiga al centro.
  const hInset = ((sp.plotMarginLeft ?? 66) + (sp.plotMarginRight ?? 24)) / 2;
  const margin = {
    top: (sp.plotMarginTop ?? 24) + headerH + 8,
    right: hInset,
    bottom: sp.plotMarginBottom ?? 40,
    left: hInset,
  };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const centerX = margin.left + plotW / 2;
  const vsLabel = (config.faceVsLabel ?? 'VS').trim();

  const hasEntities = entities.length > 0;

  // Divide el plot en dos bandas iguales (o centra una única entidad).
  const bands =
    entities.length === 1
      ? [{x: centerX, w: plotW}]
      : entities.map((_, i) => {
          const half = plotW / 2;
          const x = margin.left + i * half;
          return {x: x + half / 2, w: half};
        });

  const render = entities.map((entity, i) => {
    const band = bands[i];
    const clipId = nextSvgId('fo-av');
    return (
      <g key={i} opacity={st.globalOpacity}>
        <EntityColumn
          entity={entity}
          cx={band.x}
          plotTop={margin.top}
          plotBottom={margin.top + plotH}
          sideW={band.w}
          config={config}
          st={st}
          photoClipId={clipId}
        />
      </g>
    );
  });

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
        {frameRect(config)}
        <ChartOverlays config={config} st={st} width={width} zIndexFilter="back" />
        <Zone id="header">
          {(config.title || config.subtitle) && <SvgHeader config={config} st={st} width={width} />}
        </Zone>
        {hasEntities && (
          <Zone id="plot">
            {render}
            {entities.length === 2 && vsLabel && (
              <g>
                <line
                  x1={centerX}
                  y1={margin.top + 6}
                  x2={centerX}
                  y2={margin.top + plotH - 6}
                  stroke={st.axisColor}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.6}
                />
                <g transform={`translate(${centerX}, ${margin.top + plotH / 2})`}>
                  <circle r={12} fill="#0a0a0a" opacity={0.85} />
                  <text
                    y={1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={11}
                    fontWeight={700}
                    fill="#fff"
                  >
                    {vsLabel}
                  </text>
                </g>
              </g>
            )}
          </Zone>
        )}
        <ChartOverlays config={config} st={st} width={width} zIndexFilter="front" />
      </svg>
    </div>
  );
}