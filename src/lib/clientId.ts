/**
 * Per-submission client id used for idempotent writes (wishes / postcards).
 *
 * The D1 tables carry a `client_id` column with a partial unique index
 * (`WHERE client_id IS NOT NULL`). The backend treats a repeated client id
 * as a no-op, so a retried submission (e.g. after a dropped request) never
 * creates a duplicate row. Each *new* submission therefore needs a fresh,
 * unique id; the same id must be reused when that submission is retried from
 * the offline outbox.
 *
 * `crypto.randomUUID()` is available over HTTPS (the production site). The
 * fallback keeps things working in non-secure local contexts.
 */
export function newClientId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
