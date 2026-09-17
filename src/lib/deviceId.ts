import { newClientId } from './clientId';

/**
 * Stable per-browser id used by the apple-album likes.
 *
 * Persisted in localStorage so the "one like per photo per day" rule is
 * enforced per *device* rather than per page load. Losing it (private mode,
 * cleared storage) only means the device may like again — the server also
 * throttles by IP.
 */
const DEVICE_KEY = 'st-device';

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
  } catch {
    /* storage blocked — fall through to a throwaway id */
  }
  const id = newClientId();
  try {
    localStorage.setItem(DEVICE_KEY, id);
  } catch {
    /* ignore */
  }
  return id;
}
