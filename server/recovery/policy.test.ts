import { describe, expect, it } from "vitest";
import type { RecoveryCandidate, RecoveryPolicyInput } from "../../shared/recovery";
import { buildAuditEntry } from "./audit";
import { evaluateRecoveryPolicy, validateActionCommand } from "./policy";

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
  externalPaymentId: "pay_test_123",
  failureType: "TEMPORARY_DECLINE",
  consentGranted: true,
  retryCount: 0,
  reminderCount: 0,
  confidenceBps: 9_200,
  isAmbiguous: false,
  hasRiskFlag: false,
  alreadyResolved: false,
};

describe("recovery policy", () => {
  it("permits a low-risk eligible case to proceed automatically", () => {
    const result = evaluateRecoveryPolicy(policy, candidate);
    expect(result).toMatchObject({ eligible: true, requiresApproval: false, stoppingReason: null });
    expect(result.matchedRules).toContain("AUTO_ACTION_ALLOWED");
  });

  it("stops a case that does not have the required consent", () => {
    const result = evaluateRecoveryPolicy(policy, { ...candidate, consentGranted: false });
    expect(result).toMatchObject({ eligible: false, stoppingReason: "CONSENT_REQUIRED" });
  });

  it("requires merchant approval for a high-value case", () => {
    const result = evaluateRecoveryPolicy(policy, { ...candidate, amountPaise: 50_001 });
    expect(result).toMatchObject({ eligible: true, requiresApproval: true });
    expect(result.matchedRules).toContain("AMOUNT_REQUIRES_APPROVAL");
  });

  it("refuses an action that attempts to alter the immutable amount", () => {
    const decision = evaluateRecoveryPolicy(policy, candidate);
    const result = validateActionCommand(decision, candidate, {
      actionType: "PAYMENT_LINK_FALLBACK",
      amountPaise: 25_001,
      customerIdentity: candidate.customerIdentity,
      externalPaymentId: candidate.externalPaymentId,
      idempotencyKey: "case-1-link-1",
    });
    expect(result).toEqual({ valid: false, reason: "AMOUNT_IMMUTABILITY_VIOLATION" });
  });

  it("refuses an action that attempts to alter the customer identity", () => {
    const decision = evaluateRecoveryPolicy(policy, candidate);
    const result = validateActionCommand(decision, candidate, {
      actionType: "PAYMENT_LINK_FALLBACK",
      amountPaise: candidate.amountPaise,
      customerIdentity: "different_customer",
      externalPaymentId: candidate.externalPaymentId,
      idempotencyKey: "case-1-link-1",
    });
    expect(result).toEqual({ valid: false, reason: "CUSTOMER_IDENTITY_IMMUTABILITY_VIOLATION" });
  });
});

describe("audit chain", () => {
  it("creates deterministic hashes and changes the hash when event payload changes", () => {
    const original = buildAuditEntry({
      recoveryCaseId: 1,
      sequence: 1,
      actorType: "SYSTEM",
      eventType: "POLICY_EVALUATED",
      payload: { amountPaise: 25_000, eligible: true },
      previousHash: null,
    });
    const repeated = buildAuditEntry({
      recoveryCaseId: 1,
      sequence: 1,
      actorType: "SYSTEM",
      eventType: "POLICY_EVALUATED",
      payload: { eligible: true, amountPaise: 25_000 },
      previousHash: null,
    });
    const altered = buildAuditEntry({
      recoveryCaseId: 1,
      sequence: 1,
      actorType: "SYSTEM",
      eventType: "POLICY_EVALUATED",
      payload: { amountPaise: 25_001, eligible: true },
      previousHash: null,
    });
    expect(original.entryHash).toBe(repeated.entryHash);
    expect(original.entryHash).not.toBe(altered.entryHash);
  });
});
