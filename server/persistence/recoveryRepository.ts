import type { RecoveryActionType, RecoveryCandidate, RecoveryCaseState } from "../../shared/recovery";

export type RecoveryPersistenceProvider = "managed" | "supabase";

export type RecoveryPersistenceStatus = {
  provider: RecoveryPersistenceProvider;
  mode: "active" | "handoff_ready";
  configured: boolean;
  publicLabel: string;
};

export type RecoveryPersistenceSnapshot = {
  caseReference: string;
  state: RecoveryCaseState;
  actionType: RecoveryActionType | null;
  candidate: Pick<RecoveryCandidate, "amountPaise" | "customerIdentity" | "externalPaymentId">;
};

/**
 * Storage seam for the governed recovery domain. The current managed database
 * remains authoritative for the buildathon demo; a future Supabase adapter can
 * implement these exact methods without changing policy or Razorpay services.
 */
export interface RecoveryPersistenceRepository {
  readonly status: RecoveryPersistenceStatus;
  persistCaseSnapshot(snapshot: RecoveryPersistenceSnapshot): Promise<void>;
}

class ManagedRecoveryRepository implements RecoveryPersistenceRepository {
  readonly status: RecoveryPersistenceStatus = {
    provider: "managed",
    mode: "active",
    configured: true,
    publicLabel: "Managed demo database active",
  };

  async persistCaseSnapshot(_snapshot: RecoveryPersistenceSnapshot): Promise<void> {
    // The existing Drizzle helpers in server/db.ts remain the active production-demo implementation.
  }
}

class SupabaseHandoffRepository implements RecoveryPersistenceRepository {
  readonly status: RecoveryPersistenceStatus = {
    provider: "supabase",
    mode: "handoff_ready",
    configured: true,
    publicLabel: "Supabase handoff configured — migration not activated",
  };

  constructor(private readonly pooledDatabaseUrl: string) {}

  async persistCaseSnapshot(_snapshot: RecoveryPersistenceSnapshot): Promise<void> {
    if (!this.pooledDatabaseUrl.startsWith("postgres://") && !this.pooledDatabaseUrl.startsWith("postgresql://")) {
      throw new Error("SUPABASE_DB_URL must be a server-side Postgres connection string.");
    }
    throw new Error("Supabase handoff is intentionally not activated in the buildathon demo. Follow docs/SUPABASE_HANDOFF.md to migrate the repository implementation.");
  }
}

export function createRecoveryPersistenceRepository(input: { supabaseDbUrl?: string } = {}): RecoveryPersistenceRepository {
  const url = input.supabaseDbUrl ?? process.env.SUPABASE_DB_URL;
  return url ? new SupabaseHandoffRepository(url) : new ManagedRecoveryRepository();
}

export function getRecoveryPersistenceStatus() {
  return createRecoveryPersistenceRepository().status;
}
