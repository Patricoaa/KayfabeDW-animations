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
 * Rasterizes the inline SVG chart to a transparent-background PNG data URL.
 * Shared by the PNG download flow and thumbnail generation.
 */
export async function chartToDataUrl(container: HTMLElement, scale = 2): Promise<string | null> {
  const svg = findChartSvg(container);
  if (!svg) return null;
  const bbox = svg.getBBox();
  const width = Math.max(bbox.width || svg.viewBox.baseVal.width, svg.getBoundingClientRect().width || 600);
  const height = Math.max(bbox.height || svg.viewBox.baseVal.height, svg.getBoundingClientRect().height || 380);

  const svgText = await prepareSvgForExport(svg);
  const url = URL.createObjectURL(new Blob([svgText], {type: 'image/svg+xml;charset=utf-8'}));

  try {
    await document.fonts.ready.catch(() => undefined);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo cargar el SVG para PNG'));
      img.src = url;
    });
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function chartToDataUrlJpg(container: HTMLElement, scale: number, quality: number): Promise<string | null> {
  const svg = findChartSvg(container);
  if (!svg) return null;
  const bbox = svg.getBBox();
  const width = Math.max(bbox.width || svg.viewBox.baseVal.width, svg.getBoundingClientRect().width || 600);
  const height = Math.max(bbox.height || svg.viewBox.baseVal.height, svg.getBoundingClientRect().height || 380);

  const svgText = await prepareSvgForExport(svg);
  const url = URL.createObjectURL(new Blob([svgText], {type: 'image/svg+xml;charset=utf-8'}));

  try {
    await document.fonts.ready.catch(() => undefined);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo cargar el SVG para JPG'));
      img.src = url;
    });
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Clones the SVG and prepares it for export: resolves fonts, embeds @font-face,
 * and inlines external images. Returns the serialized SVG string.
 */
async function prepareSvgForExport(svg: SVGSVGElement): Promise<string> {
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

  const faces = await buildFontFaceStyles(usedFamilies);
  if (faces) {
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = faces;
    clone.insertBefore(styleEl, clone.firstChild);
  }

  const images = Array.from(clone.querySelectorAll('image'));
  await Promise.all(images.map((img) => inlineImage(img)));

  return new XMLSerializer().serializeToString(clone);
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

async function buildFontFaceStyles(families: Set<string>): Promise<string> {
  const styles: string[] = [];
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
      const format = face.format || parseFontUrl(face.src).format;
      styles.push(
        `@font-face{font-family:'${clean}';src:url(${dataUrl}) format('${format}');font-weight:${face.weight};font-style:${face.style};unicode-range:U+0-10FFFF;}`,
      );
    }
  }
  return Array.from(new Set(styles)).join('\n');
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
