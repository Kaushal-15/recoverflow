import { raw, type Express, type Request, type Response } from "express";
import { digestRawPayload, normalizeFailedPaymentEvent, verifyRazorpayWebhookSignature } from "./ingestion";
import { applyRazorpayPaymentLinkOutcome, ingestSandboxEvent } from "./sandboxEngine";
import { applySupabasePaymentLinkOutcome, claimSupabaseWebhookReceipt, isSupabaseWebhookPersistenceConfigured, markSupabaseWebhookReceipt, persistSupabaseWebhookFailure } from "../persistence/supabaseWebhookRepository";

export function registerRazorpayWebhook(app: Express) {
  app.post("/api/webhooks/razorpay", raw({ type: "application/json" }), async (req: Request, res: Response) => {
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
      const payloadDigest = digestRawPayload(rawBody);
      if (["payment_link.paid", "payment_link.expired", "payment_link.partially_paid"].includes(payload.event)) {
        const providerReference = payload.payload?.payment_link?.entity?.id;
        if (typeof providerReference !== "string") return res.status(400).json({ accepted: false, code: "MISSING_PAYMENT_LINK_REFERENCE" });
        if (isSupabaseWebhookPersistenceConfigured()) {
          const receipt = await claimSupabaseWebhookReceipt({ sourceEventId: `${payload.event}:${providerReference}`, rawPayloadDigest: payloadDigest });
          if (receipt.duplicate) return res.status(202).json({ accepted: true, duplicate: true, sourceEventId: `${payload.event}:${providerReference}` });
          try {
            const outcome = await applySupabasePaymentLinkOutcome({ providerReference, event: payload.event });
            await markSupabaseWebhookReceipt({ merchantId: receipt.merchant.merchantId, sourceEventId: `${payload.event}:${providerReference}`, status: "PROCESSED" });
            return res.status(202).json({ accepted: true, persisted: true, payloadDigest, outcome });
          } catch (error) {
            await markSupabaseWebhookReceipt({ merchantId: receipt.merchant.merchantId, sourceEventId: `${payload.event}:${providerReference}`, status: "EXCEPTION" });
            throw error;
          }
        }
        const outcome = applyRazorpayPaymentLinkOutcome(providerReference, payload.event);
        return res.status(202).json({ accepted: true, sandbox: true, payloadDigest, outcome });
      }
      if (payload.event !== "payment.failed") return res.status(202).json({ accepted: true, ignored: true, reason: "UNSUPPORTED_EVENT" });
      const normalized = normalizeFailedPaymentEvent(payload);
      const receipt = isSupabaseWebhookPersistenceConfigured()
        ? await claimSupabaseWebhookReceipt({ sourceEventId: normalized.sourceEventId, rawPayloadDigest: payloadDigest })
        : null;
      if (receipt?.duplicate) return res.status(202).json({ accepted: true, duplicate: true, sourceEventId: normalized.sourceEventId });
      const recovery = await ingestSandboxEvent({
        sourceEventId: normalized.sourceEventId,
        externalPaymentId: normalized.externalPaymentId,
        amountPaise: normalized.amountPaise,
        customerIdentity: normalized.customerIdentity,
        failureType: normalized.failureType,
        consentGranted: normalized.consentGranted,
      });
      if (receipt) {
        try {
          await persistSupabaseWebhookFailure({ merchant: receipt.merchant, caseId: recovery.case.id });
          await markSupabaseWebhookReceipt({ merchantId: receipt.merchant.merchantId, sourceEventId: normalized.sourceEventId, status: "PROCESSED" });
        } catch (error) {
          await markSupabaseWebhookReceipt({ merchantId: receipt.merchant.merchantId, sourceEventId: normalized.sourceEventId, status: "EXCEPTION" });
          throw error;
        }
      }
      return res.status(202).json({
        accepted: true,
        sandbox: !receipt,
        persisted: Boolean(receipt),
        sourceEventId: normalized.sourceEventId,
        payloadDigest,
        recovery,
        message: "Verified Test Mode event accepted for recovery orchestration.",
      });
    } catch {
      return res.status(400).json({ accepted: false, code: "MALFORMED_WEBHOOK_PAYLOAD" });
    }
  });
}
