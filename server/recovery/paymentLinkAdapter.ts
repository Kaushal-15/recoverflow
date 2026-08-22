import { createHash } from "node:crypto";
import type { ValidatedActionCommand } from "../../shared/recovery";

export type SandboxPaymentLink = {
  provider: "RAZORPAY_TEST_MODE_SIMULATION";
  providerReference: string;
  shortUrl: string;
  amountPaise: number;
  currency: "INR";
  expiresAt: Date;
  idempotencyKey: string;
  sandboxNotice: "Razorpay Test Mode — Sandbox: no real money is moved.";
};

export interface PaymentLinkAdapter {
  create(command: ValidatedActionCommand, expiryMinutes: number): Promise<SandboxPaymentLink>;
}

export class SandboxPaymentLinkAdapter implements PaymentLinkAdapter {
  async create(command: ValidatedActionCommand, expiryMinutes: number): Promise<SandboxPaymentLink> {
    if (command.actionType !== "PAYMENT_LINK_FALLBACK") throw new Error("Payment Link adapter only accepts PAYMENT_LINK_FALLBACK commands");
    const token = createHash("sha256").update(command.idempotencyKey).digest("hex").slice(0, 18);
    return {
      provider: "RAZORPAY_TEST_MODE_SIMULATION",
      providerReference: `plink_sim_${token}`,
      shortUrl: `https://sandbox.example.recoverflow.local/pay/${token}`,
      amountPaise: command.amountPaise,
      currency: "INR",
      expiresAt: new Date(Date.now() + expiryMinutes * 60_000),
      idempotencyKey: command.idempotencyKey,
      sandboxNotice: "Razorpay Test Mode — Sandbox: no real money is moved.",
    };
  }
}
