import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { decideSandboxApproval, getSandboxCaseForPersistence, hydrateSandboxCase, hydrateSandboxPolicy, resetSandboxStore } from "../recovery/sandboxEngine";
import { getSupabaseCaseRuntimeSnapshot, getSupabaseDashboardSnapshotForUser, persistSandboxCaseForSupabaseUser } from "./supabaseRecoveryRepository";
import { claimSupabaseWebhookReceipt, markSupabaseWebhookReceipt } from "./supabaseWebhookRepository";

describe("Supabase restart-safe mutation hydration", () => {
  it("rehydrates a non-seed pending case after reset and persists its governed approval transition", async () => {
    const pool = new Pool({ connectionString: process.env.SUPABASE_MIGRATION_DB_URL, ssl: { rejectUnauthorized: false }, max: 1 });
    const email = process.env.RECOVERFLOW_ADMIN_EMAIL;
    const suffix = Date.now().toString();

    try {
      const profile = await pool.query<{ id: string; email: string; display_name: string | null }>("select id, email, display_name from public.profiles where email = $1", [email]);
      const user = { id: profile.rows[0]!.id, email: profile.rows[0]!.email, name: profile.rows[0]!.display_name };
      resetSandboxStore();
      const snapshot = getSandboxCaseForPersistence("RCV-1046");
      snapshot.caseReference = `RESTART-${suffix}`;
      snapshot.sourceEventId = `evt_restart_${suffix}`;
      snapshot.candidate.externalPaymentId = `pay_restart_${suffix}`;
      await persistSandboxCaseForSupabaseUser(user, snapshot);
      const receipt = await claimSupabaseWebhookReceipt({ sourceEventId: `evt_restart_receipt_${suffix}`, rawPayloadDigest: "b".repeat(64) });
      expect(receipt.duplicate).toBe(false);
      await markSupabaseWebhookReceipt({ merchantId: receipt.merchant.merchantId, sourceEventId: `evt_restart_receipt_${suffix}`, status: "PROCESSED" });

      resetSandboxStore();
      const restored = await getSupabaseCaseRuntimeSnapshot(user, snapshot.caseReference);
      expect(restored?.case.state).toBe("APPROVAL_PENDING");
      expect(restored?.case.audit).toEqual(expect.any(Array));
      hydrateSandboxPolicy(restored!.policy);
      hydrateSandboxCase(restored!.case);

      const approved = await decideSandboxApproval(snapshot.caseReference, "APPROVE");
      expect(approved.state).toBe("AWAITING_OUTCOME");
      await persistSandboxCaseForSupabaseUser(user, getSandboxCaseForPersistence(snapshot.caseReference));

      const dashboard = await getSupabaseDashboardSnapshotForUser(user);
      const durable = dashboard?.cases.find(item => item.id === snapshot.caseReference);
      expect(durable).toMatchObject({ state: "AWAITING_OUTCOME", actionType: "REMINDER" });
      expect(dashboard?.audit.some(item => item.event === "Approval granted")).toBe(true);
      expect(dashboard?.receipts.some(item => item.sourceEventId === `evt_restart_receipt_${suffix}` && item.status === "PROCESSED")).toBe(true);
    } finally {
      await pool.end();
    }
  }, 15_000);
});
