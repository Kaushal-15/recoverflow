import { describe, expect, it } from "vitest";
import { createRecoveryPersistenceRepository } from "./recoveryRepository";

describe("recovery persistence provider boundary", () => {
  it("uses the managed database by default for the live buildathon demo", () => {
    const repository = createRecoveryPersistenceRepository({});
    expect(repository.status).toMatchObject({ provider: "managed", mode: "active", configured: true });
  });

  it("recognizes a server-only Supabase Postgres URI without exposing it in status", () => {
    const repository = createRecoveryPersistenceRepository({ supabaseDbUrl: "postgresql://private:secret@pooler.supabase.com:6543/postgres" });
    expect(repository.status).toMatchObject({ provider: "supabase", mode: "handoff_ready", configured: true });
    expect(JSON.stringify(repository.status)).not.toContain("private:secret");
  });
});
