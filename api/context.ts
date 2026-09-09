import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

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
