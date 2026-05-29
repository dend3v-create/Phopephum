import { createPagesFunctionHandler } from "@remix-run/cloudflare-pages";
// @ts-ignore — build artifact generated at build time, not present during typecheck
import * as build from "../build/server/index.js";

// @ts-ignore
export const onRequest = createPagesFunctionHandler({
  build,
  getLoadContext(context) {
    return {
      cloudflare: {
        env: context.env,
        // Pages EventContext exposes ExecutionContext methods directly on context
        ctx: {
          waitUntil: context.waitUntil.bind(context),
          passThroughOnException: context.passThroughOnException.bind(context),
          props: {},
        },
      },
    };
  },
});
