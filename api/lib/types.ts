/** Shared types for the api/ tree. Kept in one file so the type surface is
 * easy to audit and re-use across Workers + Node dev runners. */

export interface ApiEnv {
  Bindings: Env;
  Variables: {
    /** Optional per-request view of the requester IP, derived from
     * `CF-Connecting-IP` / `x-forwarded-for` once at the call site. */
    clientIp?: string;
    /** Identifier for the current execution context (Worker / Node dev). */
    requestId?: string;
  };
}

export interface ModerationResult {
  status: "approved" | "pending";
  reason?: string;
}
