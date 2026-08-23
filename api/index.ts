import type { IncomingMessage, ServerResponse } from "node:http";

type ExpressHandler = (request: IncomingMessage, response: ServerResponse) => unknown;

let appPromise: Promise<ExpressHandler> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = import("../server/_core/app")
      .then(({ createRecoverFlowApp }) => createRecoverFlowApp() as unknown as ExpressHandler);
  }
  return appPromise;
}

/**
 * Explicit Vercel Node handler. Lazy initialization prevents an import-time
 * exception from becoming an opaque FUNCTION_INVOCATION_FAILED page and keeps
 * the Express/tRPC app warm across compatible function invocations.
 */
export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    const app = await getApp();
    return app(request, response);
  } catch (error) {
    appPromise = null;
    console.error("[Vercel] RecoverFlow application initialization failed", error);
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify({ error: "RECOVERFLOW_INITIALIZATION_FAILED" }));
    }
  }
}
