import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
/* Hono's ExecutionContext is a superset of the Workers one (it adds
 * `tracing`), and the Worker hands us Hono's — so type against Hono's here
 * to avoid a structural mismatch at the call site in boot.ts. */
import type { ExecutionContext } from "hono";

export interface TrpcContext {
  req: Request;
  resHeaders: Headers;
  env: Env;
  executionCtx: ExecutionContext;
  clientIp: string;
}

export async function createContext(
  opts: FetchCreateContextFnOptions,
  env: Env,
  executionCtx: ExecutionContext,
): Promise<TrpcContext> {
  const clientIp =
    opts.req.headers.get("cf-connecting-ip") ??
    opts.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  return {
    req: opts.req,
    resHeaders: opts.resHeaders,
    env,
    executionCtx,
    clientIp,
  };
}
