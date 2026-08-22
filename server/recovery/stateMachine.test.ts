import { describe, expect, it } from "vitest";
import { SandboxPaymentLinkAdapter } from "./paymentLinkAdapter";
import { buildIdempotencyKey } from "./orchestrator";
import { assertTransition, canApplyVerifiedOutcome, canTransition, isTerminalState } from "./stateMachine";

describe("recovery state machine", () => {
  it("allows only safe lifecycle transitions", () => {
    expect(canTransition("ACTION_DECIDED", "APPROVAL_PENDING")).toBe(true);
    expect(canTransition("RECOVERED", "ACTION_QUEUED")).toBe(false);
    expect(() => assertTransition("STOPPED", "ACTION_QUEUED")).toThrow("Invalid recovery state transition");
  });

  it("treats terminal outcomes as final", () => {
    expect(isTerminalState("RECOVERED")).toBe(true);
    expect(isTerminalState("STOPPED")).toBe(true);
    expect(isTerminalState("AWAITING_OUTCOME")).toBe(false);
  });

  it("requires awaiting-outcome state before applying a verified callback", () => {
    expect(canApplyVerifiedOutcome("AWAITING_OUTCOME", "RECOVERED")).toBe(true);
    expect(canApplyVerifiedOutcome("RECOVERED", "CONFLICT")).toBe(false);
  });
});

describe("idempotent sandbox payment links", () => {
  it("uses a stable action key for duplicate prevention and preserves the immutable amount", async () => {
    const idempotencyKey = buildIdempotencyKey("RCV-1042", "PAYMENT_LINK_FALLBACK", 0);
    expect(idempotencyKey).toBe(buildIdempotencyKey("RCV-1042", "PAYMENT_LINK_FALLBACK", 0));
    const adapter = new SandboxPaymentLinkAdapter();
    const link = await adapter.create({
      actionType: "PAYMENT_LINK_FALLBACK",
      amountPaise: 48_600,
      customerIdentity: "customer@merchant.test",
      externalPaymentId: "pay_rcv_1042",
      idempotencyKey,
    }, 30);
    expect(link.amountPaise).toBe(48_600);
    expect(link.idempotencyKey).toBe(idempotencyKey);
    expect(link.sandboxNotice).toContain("no real money is moved");
    expect(link.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
