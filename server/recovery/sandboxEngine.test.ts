import { describe, expect, it } from "vitest";
import { applyRazorpayPaymentLinkOutcome, applySandboxOutcome, decideSandboxApproval, getSandboxPolicy, getSandboxSnapshot, ingestSandboxBatch, ingestSandboxEvent, resetSandboxStore, runManualRecovery, triggerSandboxFailure, updateSandboxPolicy } from "./sandboxEngine";

describe("executable sandbox recovery flow", () => {
  it("progresses a low-risk manual recovery through a governed action and exactly one verified outcome", async () => {
    resetSandboxStore();
    const planned = await runManualRecovery("RCV-1042");
    expect(planned.plan.outcome).toBe("ACTION_READY");
    expect(planned.case.state).toBe("AWAITING_OUTCOME");
    expect(planned.case.actionType).toBe("SIMULATED_RETRY");

    const recovered = applySandboxOutcome("RCV-1042", "RECOVERED");
    expect(recovered).toMatchObject({ state: "RECOVERED", idempotent: false });
    const duplicate = applySandboxOutcome("RCV-1042", "RECOVERED");
    expect(duplicate).toMatchObject({ state: "RECOVERED", idempotent: true });
  });

  it("requires merchant approval before executing a high-value action", async () => {
    resetSandboxStore();
    const planned = await runManualRecovery("RCV-1041");
    expect(planned.plan.outcome).toBe("APPROVAL_REQUIRED");
    const approved = await decideSandboxApproval("RCV-1041", "APPROVE");
    expect(approved.state).toBe("AWAITING_OUTCOME");
  });

  it("stops a missing-consent case without dispatching customer contact", async () => {
    resetSandboxStore();
    const result = await triggerSandboxFailure("MISSING_CONSENT");
    expect(result).toMatchObject({ result: "STOPPED" });
    const stopped = getSandboxSnapshot().cases.find(item => item.id === "RCV-1040");
    expect(stopped?.state).toBe("STOPPED");
    expect(stopped?.actionType).toBe("NO_ACTION");
  });

  it("isolates a conflicting callback rather than counting it as recovered", () => {
    resetSandboxStore();
    const result = applySandboxOutcome("RCV-1039", "CONFLICT");
    expect(result).toMatchObject({ state: "EXCEPTION", conflict: true });
  });

  it("processes webhook-like events once and automatically progresses an eligible low-risk case", async () => {
    resetSandboxStore();
    const input = { sourceEventId: "evt_test_1", externalPaymentId: "pay_test_1", amountPaise: 12_000, customerIdentity: "new@merchant.test", failureType: "TEMPORARY_DECLINE" as const, consentGranted: true };
    const first = await ingestSandboxEvent(input);
    expect(first.duplicate).toBe(false);
    expect(first.case.state).toBe("AWAITING_OUTCOME");
    const duplicate = await ingestSandboxEvent(input);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.case.id).toBe(first.case.id);
  });

  it("feeds synthetic batch records through the same governed ingestion pipeline", async () => {
    resetSandboxStore();
    const result = await ingestSandboxBatch([
      { sourceEventId: "batch_1", externalPaymentId: "pay_batch_1", amountPaise: 15_000, customerIdentity: "batch1@merchant.test", failureType: "TEMPORARY_DECLINE", consentGranted: true, confidenceBps: 9_000, retryCount: 0 },
      { sourceEventId: "batch_2", externalPaymentId: "pay_batch_2", amountPaise: 18_000, customerIdentity: "batch2@merchant.test", failureType: "TEMPORARY_DECLINE", consentGranted: false, confidenceBps: 9_000, retryCount: 0 },
    ]);
    expect(result).toMatchObject({ processed: 2, duplicates: 0 });
  });

  it("executes a distinct reminder path after a prior customer-friction attempt", async () => {
    resetSandboxStore();
    const plan = await runManualRecovery("RCV-1043");
    expect(plan.case.actionType).toBe("REMINDER");
    expect(plan.case.state).toBe("AWAITING_OUTCOME");
    expect(applySandboxOutcome("RCV-1043", "RECOVERED").state).toBe("RECOVERED");
  });

  it("versions merchant-owned eligible failures and action permissions", () => {
    resetSandboxStore();
    const policy = updateSandboxPolicy({
      eligibleFailureTypes: ["TEMPORARY_DECLINE"],
      permittedActionTypes: ["SIMULATED_RETRY", "HUMAN_ESCALATION"],
      autoActionAmountCapPaise: 40_000,
      maxRetries: 1,
      requiresConsent: true,
      minimumConfidenceBps: 8_500,
      reminderMaxContacts: 1,
    });
    expect(policy.version).toBe(2);
    expect(getSandboxPolicy().eligibleFailureTypes).toEqual(["TEMPORARY_DECLINE"]);
    expect(getSandboxPolicy().permittedActionTypes).toEqual(["SIMULATED_RETRY", "HUMAN_ESCALATION"]);
  });

  it("applies a recognized payment-link outcome only once through the signed callback path", async () => {
    resetSandboxStore();
    const planned = await runManualRecovery("RCV-1041");
    expect(planned.plan.outcome).toBe("APPROVAL_REQUIRED");
    const approved = await decideSandboxApproval("RCV-1041", "APPROVE");
    const providerReference = approved.paymentLink?.providerReference;
    expect(providerReference).toBeTruthy();
    const first = applyRazorpayPaymentLinkOutcome(providerReference!, "payment_link.paid");
    const duplicate = applyRazorpayPaymentLinkOutcome(providerReference!, "payment_link.paid");
    expect(first).toMatchObject({ state: "RECOVERED", idempotent: false });
    expect(duplicate).toMatchObject({ state: "RECOVERED", idempotent: true });
  });
});
