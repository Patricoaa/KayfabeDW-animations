/**
 * Static chart export utilities (client-only).
 * Serializes the rendered SVG chart to a downloadable .svg file and/or a .png
 * rasterized via an offscreen canvas. PNG export requires the SVG to not rely on
 * external resources; our charts are self-contained SVG generated inline, so this
 * works without a server round-trip.
 */

export function findChartSvg(root: HTMLElement | null): SVGSVGElement | null {
  if (!root) return null;
  return root.querySelector('svg');
}

export function downloadChartSvg(container: HTMLElement, filename: string): boolean {
  const svg = findChartSvg(container);
  if (!svg) return false;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const svgText = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svgText}`], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${filename}.svg`);
  URL.revokeObjectURL(url);
  return true;
}

export async function downloadChartPng(container: HTMLElement, filename: string): Promise<boolean> {
  const svg = findChartSvg(container);
  if (!svg) return false;
  const bbox = svg.getBBox();
  const width = Math.max(bbox.width || svg.viewBox.baseVal.width, svg.getBoundingClientRect().width || 600);
  const height = Math.max(bbox.height || svg.viewBox.baseVal.height, svg.getBoundingClientRect().height || 380);
  const scale = 2;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const svgText = new XMLSerializer().serializeToString(clone);
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL('image/png');
    triggerDownload(png, `${filename}.png`);
    return true;
  } finally {
    URL.revokeObjectURL(url);
  }
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
