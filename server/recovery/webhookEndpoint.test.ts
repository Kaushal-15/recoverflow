import { createHmac } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { resetSandboxStore } from "./sandboxEngine";
import { registerRazorpayWebhook } from "./webhook";

afterEach(() => resetSandboxStore());

describe("Razorpay signed webhook endpoint", () => {
  it("accepts a raw Test Mode payment.failed payload signed with the configured webhook secret", async () => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    expect(secret).toBeTruthy();

    const payload = JSON.stringify({
      event: "payment.failed",
      event_id: "evt_secret_validation",
      created_at: 1_787_408_000,
      payload: {
        payment: {
          entity: {
            id: "pay_secret_validation",
            amount: 10_000,
            currency: "INR",
            email: "webhook-validation@merchant.test",
            error_code: "BAD_REQUEST_ERROR",
            error_description: "issuer declined the payment",
            notes: { recovery_consent: "false" },
          },
        },
      },
    });
    const signature = createHmac("sha256", secret!).update(payload).digest("hex");
    const app = express();
    registerRazorpayWebhook(app);
    const server = app.listen(0);
    await once(server, "listening");

    try {
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/api/webhooks/razorpay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Razorpay-Signature": signature },
        body: payload,
      });
      const body = await response.json() as { accepted?: boolean; sourceEventId?: string };

      expect(response.status).toBe(202);
      expect(body).toMatchObject({ accepted: true, sourceEventId: "evt_secret_validation" });
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
