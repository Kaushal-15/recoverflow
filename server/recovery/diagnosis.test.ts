import { describe, expect, it } from "vitest";
import { deterministicDiagnosis } from "./diagnosis";

describe("grounded diagnosis fallback", () => {
  const candidate = {
    amountPaise: 40_000,
    customerIdentity: "buyer@merchant.test",
    externalPaymentId: "pay_test",
    failureType: "CUSTOMER_FRICTION" as const,
    consentGranted: true,
    retryCount: 1,
    reminderCount: 0,
    confidenceBps: 8_800,
    isAmbiguous: false,
    hasRiskFlag: false,
    alreadyResolved: false,
  };

  it("returns evidence and chooses only an allowed action", () => {
    const diagnosis = deterministicDiagnosis(candidate, ["REMINDER", "HUMAN_ESCALATION"]);
    expect(diagnosis.recommendedAction).toBe("REMINDER");
    expect(diagnosis.evidence).toHaveLength(3);
    expect(diagnosis.modelId).toBe("deterministic-sandbox-fallback");
  });

  it("routes insufficient evidence to human escalation", () => {
    const diagnosis = deterministicDiagnosis({ ...candidate, failureType: "INSUFFICIENT_CONTEXT", isAmbiguous: true }, ["HUMAN_ESCALATION"]);
    expect(diagnosis.recommendedAction).toBe("HUMAN_ESCALATION");
    expect(diagnosis.confidenceBps).toBeLessThan(8_000);
  });
});
