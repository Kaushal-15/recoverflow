import type { Request, Response } from "express";
import { createRequire } from "node:module";

type RecoverFlowAppModule = {
  createRecoverFlowApp: () => (request: Request, response: Response) => void;
};

const require = createRequire(import.meta.url);
const { createRecoverFlowApp } = require("../dist/vercel-app.cjs") as RecoverFlowAppModule;
const app = createRecoverFlowApp();

export default function recoverFlowVercelHandler(request: Request, response: Response) {
  return app(request, response);
}
