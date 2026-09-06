export type PlatformId = 'tiktok' | 'reels' | 'shorts' | 'custom';

export interface SafeZoneMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SafeZoneSettings {
  visible: boolean;
  platform: PlatformId;
  margins: SafeZoneMargins;
}

export const SAFE_ZONE_REF = {width: 1080, height: 1920};

// Dead-zone margins for each platform as pixels in the reference 9:16 frame
// (1080×1920). The safe zone is the canvas minus these margins.
export const PLATFORM_PRESETS: Record<Exclude<PlatformId, 'custom'>, {label: string; margins: SafeZoneMargins}> = {
  tiktok: {label: 'TikTok', margins: {top: 108, right: 120, bottom: 320, left: 60}},
  reels: {label: 'Instagram Reels', margins: {top: 210, right: 84, bottom: 310, left: 0}},
  shorts: {label: 'YouTube Shorts', margins: {top: 120, right: 96, bottom: 300, left: 0}},
};

export const DEFAULT_SAFE_ZONES: SafeZoneSettings = {
  visible: true,
  platform: 'tiktok',
  margins: PLATFORM_PRESETS.tiktok.margins,
};

const STORAGE_KEY = 'kdw:safe-zones-v1';

export function loadSafeZones(): SafeZoneSettings {
  if (typeof window === 'undefined') return DEFAULT_SAFE_ZONES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SAFE_ZONES;
    const parsed = JSON.parse(raw) as Partial<SafeZoneSettings>;
    const margins: SafeZoneMargins = {...DEFAULT_SAFE_ZONES.margins, ...(parsed.margins ?? {})};
    const platform = parsed.platform === 'tiktok' || parsed.platform === 'reels' || parsed.platform === 'shorts' || parsed.platform === 'custom'
      ? parsed.platform
      : DEFAULT_SAFE_ZONES.platform;
    return {
      visible: parsed.visible ?? DEFAULT_SAFE_ZONES.visible,
      platform,
      margins,
    };
  } catch {
    return DEFAULT_SAFE_ZONES;
  }
}

export function saveSafeZones(settings: SafeZoneSettings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Best-effort persistence
  }
}

// Validate an untrusted / JSON round-tripped value into a full SafeZoneSettings
// (used when restoring a saved viz_spec or a shared link). Returns undefined
// when the payload carries no safe-zone fields at all.
export function safeZonesFromConfig(value: Partial<SafeZoneSettings> | null | undefined): SafeZoneSettings | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const {visible, platform, margins} = value as Partial<SafeZoneSettings>;
  if (visible === undefined && platform === undefined && !margins) return undefined;
  const isPlatform = platform === 'tiktok' || platform === 'reels' || platform === 'shorts' || platform === 'custom';
  return {
    visible: visible ?? DEFAULT_SAFE_ZONES.visible,
    platform: isPlatform ? platform : DEFAULT_SAFE_ZONES.platform,
    margins: {...DEFAULT_SAFE_ZONES.margins, ...(margins ?? {})},
  };
}

// Convert reference-frame (1080×1920) margins to pixels in the actual canvas.
export function toCanvasMargins(margins: SafeZoneMargins, width: number, height: number): SafeZoneMargins {
  const sx = width / SAFE_ZONE_REF.width;
  const sy = height / SAFE_ZONE_REF.height;
  return {
    top: Math.round(margins.top * sy),
    right: Math.round(margins.right * sx),
    bottom: Math.round(margins.bottom * sy),
    left: Math.round(margins.left * sx),
  };
}