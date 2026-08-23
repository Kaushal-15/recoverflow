let app;

function getApp() {
  if (!app) {
    const { createRecoverFlowApp } = require("../dist/vercel-app.cjs");
    app = createRecoverFlowApp();
  }
  return app;
}

module.exports = async function recoverFlowVercelHandler(request, response) {
  try {
    return getApp()(request, response);
  } catch (error) {
    console.error("[Vercel] RecoverFlow application initialization failed", error);
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify({ error: "RECOVERFLOW_INITIALIZATION_FAILED" }));
    }
  }
};
