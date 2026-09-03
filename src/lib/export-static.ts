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
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo cargar el SVG para PNG'));
      img.src = url;
    });
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
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo cargar el SVG para JPG'));
      img.src = url;
    });
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
      if (v) return cleanFamily(v);
      return '';
    }
    return '';
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
    let faces: FontFace[] = [];
    try {
      faces = Array.from(document.fonts).filter((f) => cleanFamily(f.family) === clean);
      if (faces.length === 0) {
        await document.fonts.load(`16px ${clean}`).catch(() => undefined);
        faces = Array.from(document.fonts).filter((f) => cleanFamily(f.family) === clean);
      }
    } catch {
      faces = [];
    }
    for (const face of faces) {
      const src = (face as unknown as {src?: string}).src ?? '';
      const url = parseFontUrl(src);
      if (!url) continue;
      let dataUrl: string;
      try {
        const res = await fetch(url, {mode: 'cors'});
        const blob = await res.blob();
        dataUrl = await blobToDataUrl(blob);
      } catch {
        continue;
      }
      const ext = (url.split('?')[0].split('.')[1] ?? 'woff2').toLowerCase();
      const format = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext;
      styles.push(
        `@font-face{font-family:'${clean}';src:url(${dataUrl}) format('${format}');font-weight:${face.weight};font-style:${face.style};unicode-range:${face.unicodeRange || 'U+0-10FFFF'};}`,
      );
    }
  }
  return styles.join('\n');
}

function parseFontUrl(src: string): string | null {
  const m = src.match(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/);
  return m ? m[2] : null;
}

async function inlineImage(img: SVGGraphicsElement): Promise<void> {
  const href = img.getAttribute('href') || (img as SVGElement).getAttributeNS('http://www.w3.org/1999/xlink', 'href');
  if (!href || href.startsWith('data:')) return;
  try {
    const res = await fetch(href, {mode: 'cors'});
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
