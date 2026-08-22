import { createHash } from "node:crypto";
import type { ValidatedActionCommand } from "../../shared/recovery";

export type SandboxPaymentLink = {
  provider: "RAZORPAY_TEST_MODE_SIMULATION" | "RAZORPAY_TEST_MODE";
  providerReference: string;
  shortUrl: string;
  amountPaise: number;
  currency: "INR";
  expiresAt: Date;
  idempotencyKey: string;
  sandboxNotice: string;
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

export class RazorpayTestModePaymentLinkAdapter implements PaymentLinkAdapter {
  constructor(private readonly keyId: string, private readonly keySecret: string) {}

  async create(command: ValidatedActionCommand, expiryMinutes: number): Promise<SandboxPaymentLink> {
    if (command.actionType !== "PAYMENT_LINK_FALLBACK") throw new Error("Payment Link adapter only accepts PAYMENT_LINK_FALLBACK commands");
    const expiresAt = new Date(Date.now() + expiryMinutes * 60_000);
    const referenceId = `rf_${createHash("sha256").update(`${command.idempotencyKey}:${Date.now()}`).digest("hex").slice(0, 32)}`;
    const authorization = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: { "Authorization": `Basic ${authorization}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: command.amountPaise,
        currency: "INR",
        reference_id: referenceId,
        expire_by: Math.floor(expiresAt.getTime() / 1000),
        description: `RecoverFlow Test Mode recovery for ${command.externalPaymentId}`,
        reminder_enable: false,
        notify: { sms: false, email: false },
        notes: { recoverflow_payment: command.externalPaymentId, recoverflow_idempotency_key: command.idempotencyKey },
      }),
    });
    if (!response.ok) {
      const failureBody = await response.text();
      const safeDetail = failureBody.slice(0, 500).replace(/\s+/g, " ");
      throw new Error(`Razorpay Test Mode Payment Link request failed: ${response.status}${safeDetail ? ` · ${safeDetail}` : ""}`);
    }
    const payload = await response.json() as { id: string; short_url: string; expire_by?: number };
    return {
      provider: "RAZORPAY_TEST_MODE",
      providerReference: payload.id,
      shortUrl: payload.short_url,
      amountPaise: command.amountPaise,
      currency: "INR",
      expiresAt: payload.expire_by ? new Date(payload.expire_by * 1000) : expiresAt,
      idempotencyKey: command.idempotencyKey,
      sandboxNotice: "Razorpay Test Mode — Sandbox: no real money is moved.",
    };
  }
}

export class ResilientTestModePaymentLinkAdapter implements PaymentLinkAdapter {
  private readonly fallback = new SandboxPaymentLinkAdapter();

  constructor(private readonly primary: PaymentLinkAdapter) {}

  async create(command: ValidatedActionCommand, expiryMinutes: number): Promise<SandboxPaymentLink> {
    try {
      return await this.primary.create(command, expiryMinutes);
    } catch (error) {
      console.warn("[RecoverFlow] Razorpay Test Mode link creation failed; preserving the governed flow with a labeled sandbox fallback.", error instanceof Error ? error.message : error);
      const fallback = await this.fallback.create(command, expiryMinutes);
      return {
        ...fallback,
        sandboxNotice: "Razorpay Test Mode request was not accepted; RecoverFlow continued in clearly labeled sandbox simulation. No real money is moved.",
      };
    }
  }
}

export function createConfiguredPaymentLinkAdapter(): PaymentLinkAdapter {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return keyId && keySecret && !process.env.VITEST
    ? new ResilientTestModePaymentLinkAdapter(new RazorpayTestModePaymentLinkAdapter(keyId, keySecret))
    : new SandboxPaymentLinkAdapter();
}
