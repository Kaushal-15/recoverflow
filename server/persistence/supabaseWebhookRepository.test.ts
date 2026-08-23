import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { getSandboxCaseForPersistence, resetSandboxStore } from "../recovery/sandboxEngine";
import { persistSandboxCaseForSupabaseUser } from "./supabaseRecoveryRepository";
import { applySupabasePaymentLinkOutcome, claimSupabaseWebhookReceipt, markSupabaseWebhookReceipt } from "./supabaseWebhookRepository";

describe("Supabase webhook persistence", () => {
  it("enforces receipt idempotency and stores a verified Payment Link outcome", async () => {
    const pool = new Pool({ connectionString: process.env.SUPABASE_MIGRATION_DB_URL, ssl: { rejectUnauthorized: false }, max: 1 });
    const email = process.env.RECOVERFLOW_ADMIN_EMAIL;
    expect(email).toBeTruthy();
    const suffix = Date.now().toString();

    try {
      const admin = await pool.query<{ id: string; email: string; display_name: string | null }>("select id, email, display_name from public.profiles where email = $1", [email]);
      expect(admin.rows[0]).toBeTruthy();

      const firstClaim = await claimSupabaseWebhookReceipt({ sourceEventId: `evt_receipt_${suffix}`, rawPayloadDigest: "a".repeat(64) });
      expect(firstClaim.duplicate).toBe(false);
      await markSupabaseWebhookReceipt({ merchantId: firstClaim.merchant.merchantId, sourceEventId: `evt_receipt_${suffix}`, status: "PROCESSED" });
      const duplicateClaim = await claimSupabaseWebhookReceipt({ sourceEventId: `evt_receipt_${suffix}`, rawPayloadDigest: "a".repeat(64) });
      expect(duplicateClaim.duplicate).toBe(true);

      resetSandboxStore();
      const snapshot = getSandboxCaseForPersistence("RCV-1041");
      snapshot.caseReference = `WEBHOOK-${suffix}`;
      snapshot.sourceEventId = `evt_case_${suffix}`;
      snapshot.candidate.externalPaymentId = `pay_webhook_${suffix}`;
      snapshot.paymentLink = {
        provider: "RAZORPAY_TEST_MODE_SIMULATION",
        providerReference: `plink_webhook_${suffix}`,
        shortUrl: "https://sandbox.example.recoverflow.local/test",
        amountPaise: snapshot.candidate.amountPaise,
        currency: "INR",
        expiresAt: new Date(Date.now() + 1_800_000),
        idempotencyKey: `sandbox:${snapshot.caseReference}:PAYMENT_LINK_FALLBACK`,
        sandboxNotice: "Test persistence only.",
      };
      await persistSandboxCaseForSupabaseUser({ id: admin.rows[0]!.id, email: admin.rows[0]!.email, name: admin.rows[0]!.display_name }, snapshot);
      const outcome = await applySupabasePaymentLinkOutcome({ providerReference: snapshot.paymentLink.providerReference, event: "payment_link.paid" });
      expect(outcome).toMatchObject({ state: "RECOVERED", idempotent: false });

      const persisted = await pool.query<{ state: string; audit_count: number }>(`
        select rc.state, count(ae.id)::int as audit_count
        from public.recovery_cases rc
        left join public.audit_entries ae on ae.recovery_case_id = rc.id
        where rc.case_reference = $1
        group by rc.state
      `, [snapshot.caseReference]);
      expect(persisted.rows[0]).toMatchObject({ state: "RECOVERED" });
      expect(persisted.rows[0]?.audit_count).toBeGreaterThan(0);
    } finally {
      await pool.end();
    }
  }, 15_000);
});
