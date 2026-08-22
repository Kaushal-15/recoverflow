import type { Express, Request, Response } from "express";
import { digestRawPayload, normalizeFailedPaymentEvent, verifyRazorpayWebhookSignature } from "./ingestion";
import { applyRazorpayPaymentLinkOutcome, ingestSandboxEvent } from "./sandboxEngine";

export function registerRazorpayWebhook(app: Express) {
  app.post("/api/webhooks/razorpay", async (req: Request, res: Response) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    const signature = req.header("X-Razorpay-Signature") ?? undefined;
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      return res.status(503).json({ accepted: false, code: "TEST_MODE_WEBHOOK_NOT_CONFIGURED", message: "Razorpay Test Mode webhook verification is not configured. The in-app sandbox simulator remains available." });
    }
    if (!verifyRazorpayWebhookSignature(rawBody, signature, secret)) {
      return res.status(401).json({ accepted: false, code: "INVALID_WEBHOOK_SIGNATURE" });
    }
    try {
      const payload = JSON.parse(rawBody.toString("utf8"));
      if (["payment_link.paid", "payment_link.expired", "payment_link.partially_paid"].includes(payload.event)) {
        const providerReference = payload.payload?.payment_link?.entity?.id;
        if (typeof providerReference !== "string") return res.status(400).json({ accepted: false, code: "MISSING_PAYMENT_LINK_REFERENCE" });
        const outcome = applyRazorpayPaymentLinkOutcome(providerReference, payload.event);
        return res.status(202).json({ accepted: true, sandbox: true, payloadDigest: digestRawPayload(rawBody), outcome });
      }
      if (payload.event !== "payment.failed") return res.status(202).json({ accepted: true, ignored: true, reason: "UNSUPPORTED_EVENT" });
      const normalized = normalizeFailedPaymentEvent(payload);
      const recovery = await ingestSandboxEvent({
        sourceEventId: normalized.sourceEventId,
        externalPaymentId: normalized.externalPaymentId,
        amountPaise: normalized.amountPaise,
        customerIdentity: normalized.customerIdentity,
        failureType: normalized.failureType,
        consentGranted: normalized.consentGranted,
      });
      return res.status(202).json({
        accepted: true,
        sandbox: true,
        sourceEventId: normalized.sourceEventId,
        payloadDigest: digestRawPayload(rawBody),
        recovery,
        message: "Verified Test Mode event accepted for recovery orchestration.",
      });
    } catch {
      return res.status(400).json({ accepted: false, code: "MALFORMED_WEBHOOK_PAYLOAD" });
    }
  });
}
