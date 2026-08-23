import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { appRouter } from "../routers";
import { registerRazorpayWebhook } from "../recovery/webhook";
import { createContext } from "./context";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";

/**
 * Shared HTTP application used by the local Node server and the Vercel Function.
 * It intentionally does not call listen(), keeping Vercel serverless-compatible.
 */
export function createRecoverFlowApp() {
  const app = express();
  registerRazorpayWebhook(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app;
}
