import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { RecoveryCandidate, RecoveryPolicyInput } from "../../shared/recovery";
import { verifyRazorpayWebhookSignature } from "./ingestion";
import { planRecovery } from "./orchestrator";

const policy: RecoveryPolicyInput = {
  eligibleFailureTypes: ["TEMPORARY_DECLINE", "CUSTOMER_FRICTION"],
  permittedActionTypes: ["SIMULATED_RETRY", "PAYMENT_LINK_FALLBACK", "REMINDER"],
  autoActionAmountCapPaise: 50_000,
  maxRetries: 2,
  requiresConsent: true,
  minimumConfidenceBps: 8_000,
  reminderMaxContacts: 2,
};

const candidate: RecoveryCandidate = {
  amountPaise: 25_000,
  customerIdentity: "customer_123",
  externalPaymentId: "pay_123",
  failureType: "TEMPORARY_DECLINE",
  consentGranted: true,
  retryCount: 0,
  reminderCount: 0,
  confidenceBps: 9_000,
  isAmbiguous: false,
  hasRiskFlag: false,
  alreadyResolved: false,
};

describe("recovery orchestrator", () => {
  it("creates an action-ready plan without mutating payment facts", () => {
    const result = planRecovery({ policy, candidate, caseReference: "RCV-1001" });
    expect(result.outcome).toBe("ACTION_READY");
    expect(result.action).toMatchObject({
      actionType: "SIMULATED_RETRY",
      amountPaise: candidate.amountPaise,
      customerIdentity: candidate.customerIdentity,
      externalPaymentId: candidate.externalPaymentId,
    });
  });

  it("requires approval for high-value recovery", () => {
    const result = planRecovery({ policy, candidate: { ...candidate, amountPaise: 50_001 }, caseReference: "RCV-1002" });
    expect(result.outcome).toBe("APPROVAL_REQUIRED");
  });

  it("routes an ambiguous recovery to the permitted human-escalation action", () => {
    const escalationPolicy = { ...policy, permittedActionTypes: [...policy.permittedActionTypes, "HUMAN_ESCALATION" as const] };
    const result = planRecovery({ policy: escalationPolicy, candidate: { ...candidate, isAmbiguous: true }, caseReference: "RCV-1003" });
    expect(result.outcome).toBe("APPROVAL_REQUIRED");
    expect(result.action?.actionType).toBe("HUMAN_ESCALATION");
  });

  it("validates exact raw-body HMAC signatures", () => {
    const raw = Buffer.from('{"event":"payment.failed"}');
    const signature = createHmac("sha256", "demo_webhook_secret").update(raw).digest("hex");
    expect(verifyRazorpayWebhookSignature(raw, signature, "demo_webhook_secret")).toBe(true);
    expect(verifyRazorpayWebhookSignature(Buffer.from('{"event":"payment.failed" }'), signature, "demo_webhook_secret")).toBe(false);
  });
});
