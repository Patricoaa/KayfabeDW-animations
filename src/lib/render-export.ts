// Shared helpers for the animated export flow (/api/render). Keeps both export
// surfaces (preview button + export panel) consistent about serverless profile
// decisions, input item caps and safe parsing of the render response.
//
// On Hobby, Vercel functions have a hard 300s cap. Heavy renders (long
// durations and/or thousands of items) risk a 504, which arrives as an HTML
// page — so the client must never blindly res.json().

// Thresholds for the reduced serverless MP4 profile (1280x720@24fps):
// a render at 1080p30 is fine up to ~6s of frames or 1000 items.
export const RENDER_PROFILE_FRAMES = 180;
export const RENDER_PROFILE_MAX_ITEMS = 1000;

export type RenderResult =
  | {type: 'done'; url: string; size: number}
  | {type: 'error'; message: string}
  | {type: 'unexpected'};

// Templates receive either the bare props object ({items, ...}) or the
// wrapped RemotionInputProps shape ({templateId, props: {items, ...}}).
export function getItems(props: Record<string, unknown> | null | undefined): unknown[] {
  if (!props) return [];
  const wrapped = props.props as {items?: unknown[]} | undefined;
  const items = Array.isArray(wrapped?.items) ? wrapped.items : (props.items as unknown[] | undefined);
  return Array.isArray(items) ? items : [];
}

export function usesServerlessProfile(durationInFrames: number, items: unknown[]): boolean {
  return durationInFrames > RENDER_PROFILE_FRAMES || items.length > RENDER_PROFILE_MAX_ITEMS;
}

// Cap the input items sent to the render so the payload and per-frame DOM cost
// stay within serverless budget. Returns a shallow copy; preserves shape.
export function capRenderItems<T extends Record<string, unknown> | null | undefined>(
  props: T,
  maxItems = RENDER_PROFILE_MAX_ITEMS,
): {props: T; truncated: boolean} {
  if (!props) return {props, truncated: false};
  const items = getItems(props);
  if (items.length <= maxItems) return {props, truncated: false};

  const wrapped = props.props as {items?: unknown[]} | undefined;
  const next: Record<string, unknown> = Array.isArray(wrapped?.items)
    ? {...props, props: {...wrapped, items: items.slice(0, maxItems)}}
    : {...props, items: items.slice(0, maxItems)};

  return {props: next as T, truncated: true};
}

export function renderPhaseLabel(
  durationInFrames: number,
  items: unknown[],
  truncated: boolean,
): string {
  const notes: string[] = [];
  if (usesServerlessProfile(durationInFrames, items)) notes.push('perfil 1280×720 @24fps');
  if (truncated) notes.push(`datos a ${RENDER_PROFILE_MAX_ITEMS} items`);
  return notes.length > 0
    ? `Rendering video... (${notes.join(', ')})`
    : 'Rendering video...';
}

// Parse the /api/render response safely. A non-JSON body (HTML error page from
// Vercel on timeout/OOM, proxy errors, …) becomes a readable message instead of
// a JSON.parse crash.
export async function parseRenderResponse(res: Response): Promise<RenderResult> {
  type BodyShape = {type?: string; message?: string; url?: string; size?: number};
  let body: BodyShape | null = null;
  try {
    body = (await res.json()) as BodyShape;
  } catch {
    let snippet = '';
    try {
      snippet = (await res.text()).trim().replace(/\s+/g, ' ').slice(0, 200);
    } catch {
      /* empty */
    }
    if (res.status === 504) {
      return {
        type: 'error',
        message:
          'El render superó el tiempo máximo de la función serverless (504). Probá con menor duración o reducí filas/columnas.',
      };
    }
    if (res.status === 413) {
      return {
        type: 'error',
        message: 'El payload del render supera el límite del servidor (413). Reducí filas o columnas.',
      };
    }
    return {
      type: 'error',
      message: `El servidor respondió ${res.status} sin JSON (${snippet || 'cuerpo vacío'}).`,
    };
  }

  if (!res.ok || !body || typeof body !== 'object') {
    const why = body && typeof body.message === 'string' ? body.message : `HTTP ${res.status}`;
    return {type: 'error', message: why};
  }
  if (body.type === 'done' && typeof body.url === 'string') {
    return {type: 'done', url: body.url, size: typeof body.size === 'number' ? body.size : 0};
  }
  if (body.type === 'error') {
    return {type: 'error', message: typeof body.message === 'string' ? body.message : 'Error desconocido del servidor'};
  }
  return {type: 'unexpected'};
}