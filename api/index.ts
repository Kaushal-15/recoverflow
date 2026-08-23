import { createRecoverFlowApp } from "../server/_core/app";

// Vercel detects this default Express export as the serverless API handler.
export default createRecoverFlowApp();
