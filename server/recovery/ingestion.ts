import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { FailureType } from "../../shared/recovery";

export type NormalizedFailedPaymentEvent = {
  sourceEventId: string;
  externalPaymentId: string;
  amountPaise: number;
  currency: string;
  customerIdentity: string;
  consentGranted: boolean;
  failureType: FailureType;
  failureCode: string | null;
  occurredAt: Date;
  payload: Record<string, unknown>;
};

export function digestRawPayload(rawBody: Buffer | string) {
  return createHash("sha256").update(rawBody).digest("hex");
}

export function verifyRazorpayWebhookSignature(rawBody: Buffer, signature: string | undefined, secret: string | undefined) {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function normalizeFailedPaymentEvent(raw: Record<string, any>): NormalizedFailedPaymentEvent {
  const payment = raw?.payload?.payment?.entity;
  if (!payment?.id || typeof payment.amount !== "number") {
    throw new Error("Invalid Razorpay payment.failed payload");
  }

  const failureType = mapFailureType(payment.error_code, payment.error_description);
  return {
    sourceEventId: String(raw.event_id ?? raw.id ?? `evt_${payment.id}_${raw.created_at ?? "unknown"}`),
    externalPaymentId: String(payment.id),
    amountPaise: payment.amount,
    currency: String(payment.currency ?? "INR"),
    customerIdentity: String(payment.email ?? payment.contact ?? payment.customer_id ?? "unknown_customer"),
    consentGranted: Boolean(payment.notes?.recovery_consent === "true"),
    failureType,
    failureCode: payment.error_code ? String(payment.error_code) : null,
    occurredAt: new Date((Number(raw.created_at ?? payment.created_at ?? Math.floor(Date.now() / 1000))) * 1000),
    payload: raw,
  };
}

function mapFailureType(errorCode: unknown, errorDescription: unknown): FailureType {
  const text = `${String(errorCode ?? "")} ${String(errorDescription ?? "")}`.toLowerCase();
  if (text.includes("declin") || text.includes("bank")) return "TEMPORARY_DECLINE";
  if (text.includes("insufficient") || text.includes("authentication") || text.includes("customer")) return "CUSTOMER_FRICTION";
  if (text) return "INSUFFICIENT_CONTEXT";
  return "UNSUPPORTED";
}
