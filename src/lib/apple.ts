/**
 * Shared helpers for the "An Apple A Day" album (admin + public pages).
 */

/** sessionStorage key holding the admin token after the login prompt. */
export const APPLE_ADMIN_TOKEN_KEY = 'st-apple-admin-token';

export function getAdminToken(): string {
  try {
    return sessionStorage.getItem(APPLE_ADMIN_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setAdminToken(token: string): void {
  try {
    sessionStorage.setItem(APPLE_ADMIN_TOKEN_KEY, token);
  } catch {
    /* private mode — token just won't persist */
  }
}

export function clearAdminToken(): void {
  try {
    sessionStorage.removeItem(APPLE_ADMIN_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** ~4MB backend cap on the data URL string. */
export const MAX_DATA_URL_LENGTH = 4 * 1024 * 1024;

/**
 * Downscale an image file client-side (max dimension `maxDim`, JPEG) and
 * return a base64 data URL ready for `admin.upsertApplePhoto`.
 */
export function fileToDownscaledDataUrl(
  file: File,
  maxDim = 1600,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('could not read image'));
    };
    img.src = url;
  });
}

/** Read a (small) video file into a base64 data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('could not read file'));
    reader.readAsDataURL(file);
  });
}

/** Deterministic pseudo-random in [0,1) seeded by a photo id (stable layout). */
export function seededRandom(seed: number, salt = 0): number {
  let t = (seed + 0x6d2b79f5 + salt * 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2025-06-14" -> "June 14, 2025" (no TZ surprises — plain string math).
    Pass `monthName`/`template` (e.g. from the i18n dictionary) to localize. */
export function prettyDate(date: string, monthName?: string, template?: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const month = monthName ?? MONTH_NAMES[(m ?? 1) - 1] ?? '';
  if (template) {
    return template
      .replaceAll('{year}', String(y ?? ''))
      .replaceAll('{month}', month)
      .replaceAll('{day}', String(d ?? ''));
  }
  return `${month} ${d ?? ''}, ${y ?? ''}`;
}
