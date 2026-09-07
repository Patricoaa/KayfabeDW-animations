/**
 * Static chart export utilities (client-only).
 * Serializes the rendered SVG chart to a downloadable .svg file and/or a .png
 * rasterized via an offscreen canvas. PNG export requires the SVG to not rely on
 * external resources; our charts are self-contained SVG generated inline, so this
 * works without a server round-trip.
 *
 * Before serializing we make the export lossless:
 *  - Resolve every `font-family` (var(--font-*) / inherit) to the concrete family
 *    the live document is actually using, and embed those fonts as base64 @font-face
 *    rules so the downloaded SVG / rasterized PNG keep the exact same fonts.
 *  - Copy the live computed `font-weight`, `font-style` and (when not already
 *    an attribute) `font-size` onto every exported <text>, so typography set via
 *    CSS or group inheritance survives the XML clone exactly.
 *  - Inline any external avatar <image> as a data: URI so images survive both the
 *    standalone SVG and the PNG rasterization.
 */

export function findChartSvg(root: HTMLElement | null): SVGSVGElement | null {
  if (!root) return null;
  return root.querySelector('svg');
}

export function downloadChartSvg(container: HTMLElement, filename: string): boolean {
  const svg = findChartSvg(container);
  if (!svg) return false;
  void prepareSvgForExport(svg).then((svgText) => {
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svgText}`], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${filename}.svg`);
    URL.revokeObjectURL(url);
  });
  return true;
}

export async function downloadChartPng(container: HTMLElement, filename: string, scale = 2): Promise<boolean> {
  const dataUrl = await chartToDataUrl(container, scale);
  if (!dataUrl) return false;
  triggerDownload(dataUrl, `${filename}.png`);
  return true;
}

export async function downloadChartJpg(container: HTMLElement, filename: string, scale = 2, quality = 0.92): Promise<boolean> {
  const dataUrl = await chartToDataUrlJpg(container, scale, quality);
  if (!dataUrl) return false;
  triggerDownload(dataUrl, `${filename}.jpg`);
  return true;
}

/**
 * Rasterizes the inline SVG chart to a pixel data URL.
 * Shared by the PNG download flow, JPG download flow and thumbnail generation.
 *
 * Only the *graphics* of the chart go through the SVG-as-<img> raster; the text
 * layer is redrawn directly on the canvas with the page's own webfonts. So the
 * exported pixels keep the configured typography in every browser, including
 * Firefox, which does not load @font-face fonts inside SVG images.
 */
export async function chartToDataUrl(container: HTMLElement, scale = 2): Promise<string | null> {
  const svg = findChartSvg(container);
  if (!svg) return null;
  const {width, height} = exportSvgSize(svg);
  return rasterizeChart(svg, width, height, scale, 'png');
}

async function chartToDataUrlJpg(container: HTMLElement, scale: number, quality: number): Promise<string | null> {
  const svg = findChartSvg(container);
  if (!svg) return null;
  const {width, height} = exportSvgSize(svg);
  return rasterizeChart(svg, width, height, scale, 'jpeg', quality);
}

function exportSvgSize(svg: SVGSVGElement): {width: number; height: number} {
  const bbox = svg.getBBox();
  const width = Math.max(bbox.width || svg.viewBox.baseVal.width, svg.getBoundingClientRect().width || 600);
  const height = Math.max(bbox.height || svg.viewBox.baseVal.height, svg.getBoundingClientRect().height || 380);
  return {width, height};
}

type RasterFormat = 'png' | 'jpeg';

async function rasterizeChart(
  svg: SVGSVGElement,
  width: number,
  height: number,
  scale: number,
  format: RasterFormat,
  jpegQuality?: number,
): Promise<string | null> {
  // Typography is captured from the *live* chart (attached element -> computed
  // styles resolve), then the graphics-only copy is what gets rasterized.
  const textSpecs = captureTextSpecs(svg);
  const {clone, usedFamilies} = cloneResolvedSvg(svg);
  const graphics = clone.cloneNode(true) as SVGSVGElement;
  graphics.querySelectorAll('text').forEach((t) => t.remove());
  await Promise.all(Array.from(graphics.querySelectorAll('image')).map((img) => inlineImage(img)));

  const faces = await buildFontFaceList(usedFamilies);
  await ensurePageFonts(faces);

  const svgText = new XMLSerializer().serializeToString(graphics);
  const url = URL.createObjectURL(new Blob([svgText], {type: 'image/svg+xml;charset=utf-8'}));

  try {
    await document.fonts.ready.catch(() => undefined);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo cargar el SVG para la exportación'));
      img.src = url;
    });
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    drawTextLayer(ctx, textSpecs, scale);
    return format === 'jpeg' ? canvas.toDataURL('image/jpeg', jpegQuality) : canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Registers every family/weight used in the chart as a page-level font so the
// canvas text layer renders the exact configured webfonts (Chromium and Firefox
// both honour document fonts for canvas fillText).
async function ensurePageFonts(faces: FontFaceSpec[]): Promise<void> {
  await document.fonts.ready.catch(() => undefined);
  const loaded = new Set<string>();
  for (const f of faces) {
    try {
      await document.fonts.load(`${f.weight} 16px "${f.family}"`).catch(() => undefined);
      loaded.add(`${f.family}|${f.weight}`);
    } catch {
      /* best-effort */
    }
  }
  for (const f of faces) {
    if (loaded.has(`${f.family}|${f.weight}`)) continue;
    try {
      const face = new FontFace(f.family, `url(${f.dataUrl}) format('${f.format}')`, {weight: f.weight, style: f.style});
      document.fonts.add(face);
      await face.load().catch(() => undefined);
    } catch {
      /* best-effort */
    }
  }
}

type TextLineSpec = {x: number; y: number; text: string};

// 2×3 affine matrix (column-vector convention): x' = a*x + c*y + e, y' = b*x + d*y + f.
// Maps a <text>'s local coordinates (its own x/y attributes) up to the root SVG
// viewBox by composing the element's own transform with every ancestor's.
type Mat = [number, number, number, number, number, number];

const IDENTITY_MAT: Mat = [1, 0, 0, 1, 0, 0];

type TextSpec = {
  align: CanvasTextAlign;
  font: string;
  fill: string;
  letterSpacing: number;
  baseline: CanvasTextBaseline;
  ctm: Mat;
  lines: TextLineSpec[];
};

// Reads the exact layout+typography of every live <text> so the canvas text
// layer can reproduce the preview glyph for glyph (single line, truncated,
// wrapped tspans and rotated labels).
function captureTextSpecs(svgEl: SVGSVGElement): TextSpec[] {
  const specs: TextSpec[] = [];
  for (const el of Array.from(svgEl.querySelectorAll('text'))) {
    const cs = getComputedStyle(el) as CSSStyleDeclaration & {fill?: string; textAnchor?: string};
    const family = resolveFontFamily(el.getAttribute('font-family') ?? '', el);
    if (!family) continue;
    const size = numOf(el.getAttribute('font-size') || cs.fontSize, 16);
    const weightValue = el.getAttribute('font-weight') || cs.fontWeight;
    const weight = weightValue === 'normal' ? '400' : weightValue;
    const style = cs.fontStyle;
    const fill = cs.fill && !cs.fill.startsWith('url(') ? cs.fill : '#000';
    const align: CanvasTextAlign = cs.textAnchor === 'middle' ? 'center' : cs.textAnchor === 'end' ? 'right' : 'left';
    const letterSpacing = lsOf(cs.letterSpacing);
    const baseline = baselineOf(cs);
    const ctm = composeTransform(el);
    const x = numOf(el.getAttribute('x'), 0);
    const y = numOf(el.getAttribute('y'), 0);

    let lines: TextLineSpec[];
    const tspans = Array.from(el.querySelectorAll('tspan'));
    if (tspans.length > 0) {
      lines = [];
      let yAcc = 0;
      for (const ts of tspans) {
        yAcc += unitValue(ts.getAttribute('dy'), size);
        lines.push({
          x: numOf(ts.getAttribute('x'), x),
          y: y + yAcc,
          text: collapseWhitespace(ts.textContent ?? ''),
        });
      }
    } else {
      lines = [{x, y, text: collapseWhitespace(el.textContent ?? '')}];
    }

    specs.push({align, font: `${style} ${weight} ${size}px "${family}"`, fill, letterSpacing, baseline, ctm, lines});
  }
  return specs;
}

function drawTextLayer(ctx: CanvasRenderingContext2D, specs: TextSpec[], scale: number): void {
  ctx.save();
  ctx.lineWidth = 0;
  for (const spec of specs) {
    const [a, b, c, d, e, f] = spec.ctm;
    ctx.save();
    ctx.setTransform(scale * a, scale * b, scale * c, scale * d, scale * e, scale * f);
    ctx.textBaseline = spec.baseline;
    ctx.fillStyle = spec.fill;
    ctx.font = spec.font;
    for (const line of spec.lines) {
      if (!line.text) continue;
      if (spec.letterSpacing) {
        ctx.textAlign = 'left';
        drawSpacedText(ctx, line.text, line.x, line.y, spec.align, spec.letterSpacing);
      } else {
        ctx.textAlign = spec.align;
        ctx.fillText(line.text, line.x, line.y);
      }
    }
    ctx.restore();
  }
  ctx.restore();
}

// Canvas fillText ignores the letter-spacing CSS property, so spaced text is
// drawn character by character with the spacing folded in (SVG applies
// letter-spacing after every glyph, including in `wrap` tspans).
function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign,
  spacing: number,
): void {
  const chars = Array.from(text);
  let total = 0;
  const widths: number[] = [];
  for (const ch of chars) {
    const w = ctx.measureText(ch).width;
    widths.push(w);
    total += w;
  }
  if (chars.length > 1) total += spacing * (chars.length - 1);
  let cursor = x;
  if (align === 'center') cursor = x - total / 2;
  else if (align === 'right') cursor = x - total;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cursor, y);
    cursor += widths[i] + spacing;
  }
}

function numOf(value: string | null, fallback: number): number {
  if (value == null) return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function unitValue(value: string | null, fontSize: number): number {
  if (!value) return 0;
  if (value.endsWith('em')) return (parseFloat(value) || 0) * fontSize;
  return parseFloat(value) || 0;
}

function lsOf(value: string): number {
  if (!value || value === 'normal') return 0;
  return numOf(value, 0);
}

// SVG collapses whitespace in text content; canvas fillText does not, so match
// the browser's rendering before drawing.
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// Maps an SVG text baseline to the equivalent canvas one. Legend labels and pie
// slices center vertically (central/middle); anything else keeps alphabetic.
function baselineOf(cs: CSSStyleDeclaration): CanvasTextBaseline {
  const db = String((cs as CSSStyleDeclaration & {dominantBaseline?: string}).dominantBaseline ?? '');
  switch (db) {
    case 'central':
    case 'middle':
      return 'middle';
    case 'hanging':
      return 'hanging';
    case 'text-before-edge':
      return 'top';
    case 'text-after-edge':
      return 'bottom';
    case 'top':
      return 'top';
    case 'bottom':
      return 'bottom';
    case 'ideographic':
      return 'ideographic';
    default:
      return 'alphabetic';
  }
}

// CTM mapping the text's local coordinates (its own x/y/transform) up to the
// root SVG's coordinate system, composing the element's own transform with every
// ancestor transform in order (legend items are placed inside translated <g>s).
function composeTransform(el: SVGElement): Mat {
  const ops: Mat[] = [];
  let cur: SVGElement | null = el;
  while (cur) {
    const a = cur.getAttribute('transform');
    if (a && a.trim()) ops.unshift(parseTransformList(a));
    if (cur.tagName.toLowerCase() === 'svg') break;
    cur = cur.parentElement as SVGElement | null;
  }
  let m: Mat = IDENTITY_MAT;
  for (const op of ops) m = mulMat(m, op);
  return m;
}

function parseTransformList(value: string): Mat {
  let m: Mat = IDENTITY_MAT;
  const re = /(translate|rotate|scale|matrix|skewX|skewY)\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    const args = match[2].split(/[\s,]+/).filter(Boolean).map((s) => parseFloat(s));
    m = mulMat(m, transformOp(match[1], args));
  }
  return m;
}

function transformOp(fn: string, a: number[]): Mat {
  switch (fn) {
    case 'translate':
      return [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    case 'scale': {
      const sx = a[0] ?? 1;
      return [sx, 0, 0, (a[1] ?? a[0]) ?? 1, 0, 0];
    }
    case 'rotate': {
      const ang = ((a[0] || 0) * Math.PI) / 180;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const r: Mat = [cos, sin, -sin, cos, 0, 0];
      if (a.length >= 3) {
        const cx = a[1] || 0;
        const cy = a[2] || 0;
        return mulMat(mulMat([1, 0, 0, 1, cx, cy], r), [1, 0, 0, 1, -cx, -cy]);
      }
      return r;
    }
    case 'matrix':
      return [a[0] || 0, a[1] || 0, a[2] || 0, a[3] || 0, a[4] || 0, a[5] || 0];
    case 'skewX':
      return [1, 0, Math.tan(((a[0] || 0) * Math.PI) / 180), 1, 0, 0];
    case 'skewY':
      return [1, Math.tan(((a[0] || 0) * Math.PI) / 180), 0, 1, 0, 0];
    default:
      return IDENTITY_MAT;
  }
}

function mulMat(m1: Mat, m2: Mat): Mat {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/**
 * Clones the SVG and prepares it for export: resolves fonts, embeds @font-face,
 * and inlines external images. Returns the serialized SVG string.
 */
async function prepareSvgForExport(svg: SVGSVGElement): Promise<string> {
  const {clone, usedFamilies} = cloneResolvedSvg(svg);
  const faces = await buildFontFaceList(usedFamilies);
  if (faces.length > 0) {
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = fontFaceCss(faces);
    clone.insertBefore(styleEl, clone.firstChild);
  }
  await Promise.all(Array.from(clone.querySelectorAll('image')).map((img) => inlineImage(img)));
  return new XMLSerializer().serializeToString(clone);
}

type ResolvedSvg = {clone: SVGSVGElement; usedFamilies: Set<string>};

// Clones the chart and projects every resolution that must survive the XML
// clone onto the copy: concrete font families, computed weight/style and
// (when inherited) font-size.
function cloneResolvedSvg(svg: SVGSVGElement): ResolvedSvg {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const originals = Array.from(svg.querySelectorAll('text'));
  const clones = Array.from(clone.querySelectorAll('text'));
  const usedFamilies = new Set<string>();

  for (let i = 0; i < originals.length; i++) {
    const resolved = resolveFontFamily(originals[i].getAttribute('font-family') ?? '', originals[i]);
    clones[i]?.setAttribute('font-family', resolved || 'inherit');
    if (resolved) usedFamilies.add(resolved);

    // Keep the exact typography the live preview renders. A detached XML clone
    // drops weight/style computed from CSS or inherited from a <g>, so copy the
    // computed values onto each exported <text>. font-size is normally already
    // an attribute; only fill it in when it wasn't set explicitly.
    const cs = getComputedStyle(originals[i]);
    const weight = cs.fontWeight;
    if (weight && weight !== '400' && weight !== 'normal') clones[i]?.setAttribute('font-weight', weight);
    if (cs.fontStyle && cs.fontStyle !== 'normal') clones[i]?.setAttribute('font-style', cs.fontStyle);
    if (!originals[i].hasAttribute('font-size') && cs.fontSize) clones[i]?.setAttribute('font-size', cs.fontSize);
  }

  return {clone, usedFamilies};
}

// Resolves a font-family attribute to the concrete family the live document uses.
function resolveFontFamily(attr: string, el: SVGGraphicsElement): string {
  const raw = attr.trim();
  if (raw.startsWith('var(')) {
    const m = attr.match(/var\((--[\w-]+)/);
    if (m) {
      const v = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim();
      if (v) {
        const clean = cleanFamily(v);
        if (clean) return clean;
      }
    }
    // Var missing/empty (e.g. font not registered) -> whatever the live element
    // actually resolves to.
    return cleanFamily(getComputedStyle(el).fontFamily);
  }
  if (raw === '' || raw === 'inherit') {
    return cleanFamily(getComputedStyle(el).fontFamily);
  }
  return cleanFamily(raw);
}

function cleanFamily(family: string): string {
  const first = family.split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, '');
}

type FontFaceSpec = {family: string; dataUrl: string; format: string; weight: string; style: string};

// Resolves every font used by `families` down to a base64 data URL. The same
// specs feed both the SVG's embedded @font-face rules and the page-level
// FontFace registrations used for the canvas text layer.
async function buildFontFaceList(families: Set<string>): Promise<FontFaceSpec[]> {
  const specs: FontFaceSpec[] = [];
  await document.fonts.ready.catch(() => undefined);
  for (const family of families) {
    const clean = cleanFamily(family);
    if (!clean) continue;

    // 1) Preferred source: the actual @font-face rules in the document's
    // stylesheets. They always expose the font src URL, unlike the FontFace
    // API (Chromium returns an empty `src` for faces loaded from CSS), which
    // is why inlining via document.fonts silently skipped every font.
    const faces = collectSheetFontFaces(clean);
    if (faces.length === 0) {
      // 2) Fallback: font-API faces (author-created / browsers that expose src).
      await document.fonts.load(`16px ${clean}`).catch(() => undefined);
      for (const face of Array.from(document.fonts)) {
        if (cleanFamily(face.family) !== clean) continue;
        const {url, format} = parseFontUrl((face as unknown as {src?: string}).src ?? '');
        if (url) faces.push({src: url, format, weight: String(face.weight), style: face.style});
      }
    }

    const seen = new Set<string>();
    for (const face of faces) {
      if (seen.has(face.src)) continue;
      seen.add(face.src);
      let dataUrl: string;
      if (face.src.startsWith('data:')) {
        dataUrl = face.src;
      } else {
        try {
          const res = await fetch(face.src, {mode: 'cors'});
          if (!res.ok) continue;
          const blob = await res.blob();
          dataUrl = await blobToDataUrl(blob);
        } catch {
          continue;
        }
      }
      specs.push({
        family: clean,
        dataUrl,
        format: face.format || parseFontUrl(face.src).format,
        weight: face.weight,
        style: face.style,
      });
    }
  }
  const dedup = new Set<string>();
  return specs.filter((s) => {
    const key = `${s.family}|${s.weight}|${s.style}|${s.dataUrl}`;
    if (dedup.has(key)) return false;
    dedup.add(key);
    return true;
  });
}

function fontFaceCss(specs: FontFaceSpec[]): string {
  return specs
    .map(
      (s) =>
        `@font-face{font-family:'${s.family}';src:url(${s.dataUrl}) format('${s.format}');font-weight:${s.weight};font-style:${s.style};unicode-range:U+0-10FFFF;}`,
    )
    .join('\n');
}

// Reads the resolved @font-face rules for `family` from every same-origin
// stylesheet (cross-origin sheets throw and are skipped). Returns the rules'
// src/format/weight/style so each face can be inlined as a data: URL.
function collectSheetFontFaces(family: string): {src: string; format: string; weight: string; style: string}[] {
  const out: {src: string; format: string; weight: string; style: string}[] = [];
  for (const sheet of Array.from(document.styleSheets ?? [])) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin stylesheet
    }
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      if (rule.type !== CSSRule.FONT_FACE_RULE) continue;
      const style = (rule as CSSFontFaceRule).style;
      const fam = (style.fontFamily || '').replace(/^['"]|['"]$/g, '').split(',')[0].trim();
      if (fam !== family) continue;
      const {url, format} = parseFontUrl(((style as CSSStyleDeclaration & {src?: string}).src ?? '') || '');
      if (!url) continue;
      out.push({
        src: resolveRelativeUrl(url, sheet.href),
        format,
        weight: style.fontWeight || '400',
        style: style.fontStyle || 'normal',
      });
    }
  }
  return out;
}

// Resolves a @font-face src against the stylesheet that declared it. Turbopack
// (and webpack) emit font URLs relative to the chunk, e.g. url(../media/f.woff2);
// fetching those as-is resolves against the document URL and 404s in production.
function resolveRelativeUrl(url: string, base: string | null): string {
  if (!base) return url;
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

function parseFontUrl(src: string): {url: string | null; format: string} {
  const m = src.match(/url\(\s*(['"]?)([^)'"]+)\1\s*\)\s*format\(\s*['"]?([a-z0-9-]+)['"]?\s*\)/);
  if (m) return {url: m[2], format: m[3]};
  const m2 = src.match(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/);
  if (m2) {
    const ext = (m2[2].split('?')[0].split('.')[1] ?? '').toLowerCase();
    return {url: m2[2], format: ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext};
  }
  return {url: null, format: ''};
}

async function inlineImage(img: SVGGraphicsElement): Promise<void> {
  const href = img.getAttribute('href') || (img as SVGElement).getAttributeNS('http://www.w3.org/1999/xlink', 'href');
  if (!href || href.startsWith('data:')) return;
  try {
    const target = /^(https?:|blob:)/.test(href) ? href : resolveRelativeUrl(href, document.baseURI);
    const res = await fetch(target, {mode: 'cors'});
    const blob = await res.blob();
    const dataUrl = await blobToDataUrl(blob);
    img.setAttribute('href', dataUrl);
    img.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
  } catch {
    // Leave as-is; not fatal.
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function sanitizeFilename(name: string): string {
  return name
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase() || 'chart';
}
