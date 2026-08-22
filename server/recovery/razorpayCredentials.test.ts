import { describe, expect, it } from "vitest";

describe("Razorpay Test Mode credentials", () => {
  it("authenticates a read-only Test Mode request", async () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    expect(keyId).toBeTruthy();
    expect(keySecret).toBeTruthy();

    const authorization = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/payments?count=1", {
      headers: { Authorization: `Basic ${authorization}` },
    });

    expect(response.ok, `Razorpay Test Mode credential check returned HTTP ${response.status}`).toBe(true);
  }, 15_000);
});
