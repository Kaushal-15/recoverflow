import type { Request, Response } from "express";

type RecoverFlowAppModule = {
  createRecoverFlowApp: () => (request: Request, response: Response) => void;
};

const { createRecoverFlowApp } = require("../dist/vercel-app.cjs") as RecoverFlowAppModule;
const app = createRecoverFlowApp();

export default function recoverFlowVercelHandler(request: Request, response: Response) {
  return app(request, response);
}
