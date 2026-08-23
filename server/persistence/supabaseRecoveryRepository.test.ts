import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { getSandboxCaseForPersistence, resetSandboxStore } from "../recovery/sandboxEngine";
import { getSupabasePersistedCaseOverrides, persistSandboxCaseForSupabaseUser } from "./supabaseRecoveryRepository";

describe("Supabase recovery repository", () => {
  it("persists a governed sandbox snapshot for the provisioned admin and preserves its audit chain", async () => {
    const pool = new Pool({
      connectionString: process.env.SUPABASE_MIGRATION_DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
    const email = process.env.RECOVERFLOW_ADMIN_EMAIL;
    expect(email).toBeTruthy();

    try {
      const admin = await pool.query<{ id: string; email: string; display_name: string | null; role: string }>(
        "select id, email, display_name, role from public.profiles where email = $1",
        [email],
      );
      expect(admin.rows[0]?.role).toBe("admin");

      resetSandboxStore();
      const snapshot = getSandboxCaseForPersistence("RCV-1042");
      const suffix = Date.now().toString();
      snapshot.caseReference = `SUPABASE-${suffix}`;
      snapshot.sourceEventId = `evt_supabase_${suffix}`;
      snapshot.candidate.externalPaymentId = `pay_supabase_${suffix}`;

      const persisted = await persistSandboxCaseForSupabaseUser({
        id: admin.rows[0]!.id,
        email: admin.rows[0]!.email,
        name: admin.rows[0]!.display_name,
      }, snapshot);

      expect(persisted?.merchantId).toBeTruthy();
      expect(persisted?.recoveryCaseId).toBeTruthy();
      const rows = await pool.query<{ state: string; audit_count: number }>(`
        select rc.state, count(ae.id)::int as audit_count
        from public.recovery_cases rc
        left join public.audit_entries ae on ae.recovery_case_id = rc.id
        where rc.id = $1
        group by rc.state
      `, [persisted?.recoveryCaseId]);
      expect(rows.rows[0]).toMatchObject({ state: snapshot.state });
      expect(rows.rows[0]?.audit_count).toBeGreaterThan(0);

      snapshot.state = "RECOVERED";
      snapshot.terminalReason = "Verified sandbox outcome recorded for persistence regression.";
      snapshot.actionType = "PAYMENT_LINK_FALLBACK";
      snapshot.audit.push({ time: "12:00:00", actor: "RAZORPAY", event: "Verified sandbox outcome: RECOVERED", detail: snapshot.terminalReason });
      await persistSandboxCaseForSupabaseUser({
        id: admin.rows[0]!.id,
        email: admin.rows[0]!.email,
        name: admin.rows[0]!.display_name,
      }, snapshot);

      const overrides = await getSupabasePersistedCaseOverrides(admin.rows[0]!.id);
      expect(overrides.get(snapshot.caseReference)).toMatchObject({
        state: "RECOVERED",
        terminal_reason: snapshot.terminalReason,
        action_type: "PAYMENT_LINK_FALLBACK",
      });
    } finally {
      await pool.end();
    }
  });
});
