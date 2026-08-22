import { describe, expect, it } from "vitest";
import { RazorpayTestModePaymentLinkAdapter } from "./paymentLinkAdapter";

const integrationDescribe = process.env.RUN_RAZORPAY_INTEGRATION_TEST === "true" ? describe : describe.skip;

integrationDescribe("Razorpay Test Mode Payment Link adapter", () => {
  it("creates a ₹1 Test Mode Payment Link with immutable action facts", async () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    expect(keyId).toBeTruthy();
    expect(keySecret).toBeTruthy();

    const adapter = new RazorpayTestModePaymentLinkAdapter(keyId!, keySecret!);
    const link = await adapter.create({
      actionType: "PAYMENT_LINK_FALLBACK",
      amountPaise: 100,
      customerIdentity: "recoverflow-test@merchant.test",
      externalPaymentId: `pay_recoverflow_test_${Date.now()}`,
      idempotencyKey: `recoverflow_test_${Date.now()}`,
    }, 30);

    expect(link.provider).toBe("RAZORPAY_TEST_MODE");
    expect(link.providerReference).toMatch(/^plink_/);
    expect(link.shortUrl).toMatch(/^https:\/\//);
    expect(link.amountPaise).toBe(100);
    expect(link.expiresAt.getTime()).toBeGreaterThan(Date.now());
  }, 20_000);
});
