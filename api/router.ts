import { createRouter, publicQuery } from "./middleware";
import { townRouter } from "./town";
import { adminRouter } from "./admin";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  town: townRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
