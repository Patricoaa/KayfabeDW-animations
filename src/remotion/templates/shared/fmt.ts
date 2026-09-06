import type {ValueFormat} from '../../../lib/animation-config';

// Format a numeric value for display. `'number'` keeps the current locale
// formatting (default, no rounding) so existing renders don't change.
export function fmtValue(v: number, format: ValueFormat = 'number', symbol = '$'): string {
  if (isNaN(v)) return '0';
  switch (format) {
    case 'short': {
      const a = Math.abs(v);
      if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
      if (a >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
      return Math.round(v).toString();
    }
    case 'decimal':
      return v.toLocaleString('es', {maximumFractionDigits: 2});
    case 'percent':
      return `${Math.round(v * 100)}%`;
    case 'currency':
      return `${symbol}${Math.round(v).toLocaleString()}`;
    case 'hhmmss': {
      const s = Math.max(0, Math.round(v));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    case 'number':
    default:
      return v.toLocaleString();
  }
}