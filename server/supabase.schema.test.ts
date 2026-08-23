import { Pool } from "pg";
import { describe, expect, it } from "vitest";

describe("RecoverFlow Supabase schema", () => {
  it("creates the control-plane tables with row-level security enabled", async () => {
    const pool = new Pool({
      connectionString: process.env.SUPABASE_MIGRATION_DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });

    try {
      const tables = await pool.query<{ tablename: string; rowsecurity: boolean }>(`
        select tablename, rowsecurity
        from pg_tables
        where schemaname = 'public'
          and tablename = any($1::text[])
      `, [["profiles", "merchant_profiles", "recovery_cases", "webhook_receipts", "audit_entries"]]);
      const byName = new Map(tables.rows.map(row => [row.tablename, row.rowsecurity]));

      expect(byName.get("profiles")).toBe(true);
      expect(byName.get("merchant_profiles")).toBe(true);
      expect(byName.get("recovery_cases")).toBe(true);
      expect(byName.get("webhook_receipts")).toBe(true);
      expect(byName.get("audit_entries")).toBe(true);

      const policy = await pool.query<{ permitted_action_types: string[] }>(`
        select permitted_action_types
        from public.merchant_policies
        where is_active = true
        order by created_at desc
        limit 1
      `);
      expect(policy.rows[0]?.permitted_action_types).toContain("HUMAN_ESCALATION");
    } finally {
      await pool.end();
    }
  });
});
