import { Pool } from "pg";
import { describe, expect, it } from "vitest";

describe("Supabase migration database connection", () => {
  it("connects to the configured server-only Postgres migration database", async () => {
    const connectionString = process.env.SUPABASE_MIGRATION_DB_URL;
    expect(connectionString).toMatch(/^postgres(?:ql)?:\/\//);

    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 8_000,
    });

    try {
      const result = await pool.query<{ database_name: string }>("select current_database() as database_name");
      expect(result.rows[0]?.database_name).toBe("postgres");
    } finally {
      await pool.end();
    }
  });
});
