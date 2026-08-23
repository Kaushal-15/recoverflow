import { Pool, type PoolClient } from "pg";
import { buildAuditEntry, type AuditActorType } from "../recovery/audit";
import type { PersistableSandboxCase } from "../db";
import type { RecoveryActionType, RecoveryCandidate } from "../../shared/recovery";

type SupabaseMerchantUser = { id: string; email: string | null; name: string | null };
type MerchantRow = { id: string };
type PolicyRow = { id: string; version: number; permitted_action_types: unknown };
type IdRow = { id: string };
type PersistedCaseRow = {
  case_reference: string;
  state: string;
  terminal_reason: string | null;
  action_type: RecoveryActionType | null;
  provider_reference: string | null;
  expires_at: Date | null;
};

let pool: Pool | null = null;

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.SUPABASE_MIGRATION_DB_URL ?? null;
}

function getPool() {
  const url = connectionString();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 2, idleTimeoutMillis: 10_000 });
  }
  return pool;
}

export function isSupabasePersistenceConfigured() {
  return Boolean(connectionString());
}

async function withTransaction<T>(work: (client: PoolClient) => Promise<T>) {
  const configuredPool = getPool();
  if (!configuredPool) return null;
  const client = await configuredPool.connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureMerchant(client: PoolClient, user: SupabaseMerchantUser) {
  const profile = await client.query<IdRow>("select id from public.profiles where id = $1", [user.id]);
  if (!profile.rows[0]) throw new Error("Supabase admin profile is not provisioned for RecoverFlow");
  const displayName = user.name || user.email || "RecoverFlow merchant";
  const merchant = await client.query<MerchantRow>(`
    insert into public.merchant_profiles (user_id, display_name)
    values ($1, $2)
    on conflict (user_id) do update set display_name = excluded.display_name, updated_at = now()
    returning id
  `, [user.id, displayName]);
  return merchant.rows[0]!;
}

async function activePolicy(client: PoolClient, merchantId: string) {
  const current = await client.query<PolicyRow>(`
    select id, version, permitted_action_types
    from public.merchant_policies
    where merchant_id = $1 and is_active = true
    order by version desc
    limit 1
  `, [merchantId]);
  if (current.rows[0]) return current.rows[0];

  const created = await client.query<PolicyRow>(`
    insert into public.merchant_policies (
      merchant_id, version, name, is_active, eligible_failure_types,
      permitted_action_types, auto_action_amount_cap_paise, max_retries,
      requires_consent, minimum_confidence_bps, reminder_max_contacts,
      escalation_rules, stopping_conditions
    ) values ($1, 1, $2, true, $3::jsonb, $4::jsonb, 50000, 2, true, 8000, 2, $5::jsonb, $6::jsonb)
    returning id, version, permitted_action_types
  `, [
    merchantId,
    "Default guarded recovery policy",
    JSON.stringify(["TEMPORARY_DECLINE", "CUSTOMER_FRICTION"]),
    JSON.stringify(["SIMULATED_RETRY", "PAYMENT_LINK_FALLBACK", "REMINDER"]),
    JSON.stringify({ highValue: "APPROVAL", ambiguous: "APPROVAL", lowConfidence: "APPROVAL" }),
    JSON.stringify(["CONSENT_REQUIRED", "RETRY_LIMIT_REACHED", "PAYMENT_ALREADY_RESOLVED"]),
  ]);
  return created.rows[0]!;
}

export async function persistSandboxCaseForSupabaseUser(user: SupabaseMerchantUser, snapshot: PersistableSandboxCase) {
  return withTransaction(async client => {
    const merchant = await ensureMerchant(client, user);
    const policy = await activePolicy(client, merchant.id);
    const event = await client.query<IdRow>(`
      insert into public.payment_events (
        merchant_id, source_event_id, source_type, event_type, raw_payload_digest,
        signature_status, external_payment_id, amount_paise, customer_identity,
        consent_granted, failure_type, payload, occurred_at
      ) values ($1, $2, 'MANUAL', 'payment.failed', $3, 'NOT_APPLICABLE', $4, $5, $6, $7, $8, $9::jsonb, now())
      on conflict (merchant_id, source_event_id) do update set source_event_id = excluded.source_event_id
      returning id
    `, [
      merchant.id,
      snapshot.sourceEventId,
      `sandbox-${snapshot.caseReference}`.padEnd(64, "0").slice(0, 64),
      snapshot.candidate.externalPaymentId,
      snapshot.candidate.amountPaise,
      snapshot.candidate.customerIdentity,
      snapshot.candidate.consentGranted,
      snapshot.candidate.failureType,
      JSON.stringify(snapshot.candidate),
    ]);
    const paymentEventId = event.rows[0]!.id;
    const recoveryCase = await client.query<IdRow>(`
      insert into public.recovery_cases (
        case_reference, merchant_id, payment_event_id, policy_id, policy_version,
        source, state, amount_snapshot_paise, customer_identity_snapshot,
        external_payment_id_snapshot, retry_count, reminder_count, risk_flags, terminal_reason
      ) values ($1, $2, $3, $4, $5, 'MANUAL', $6, $7, $8, $9, $10, $11, $12::jsonb, $13)
      on conflict (payment_event_id) do update set state = excluded.state, terminal_reason = excluded.terminal_reason, updated_at = now()
      returning id
    `, [
      snapshot.caseReference, merchant.id, paymentEventId, policy.id, policy.version, snapshot.state,
      snapshot.candidate.amountPaise, snapshot.candidate.customerIdentity, snapshot.candidate.externalPaymentId,
      snapshot.candidate.retryCount, snapshot.candidate.reminderCount,
      JSON.stringify({ ambiguous: snapshot.candidate.isAmbiguous, riskFlag: snapshot.candidate.hasRiskFlag }), snapshot.terminalReason,
    ]);
    const recoveryCaseId = recoveryCase.rows[0]!.id;

    await client.query(`
      insert into public.policy_evaluations (recovery_case_id, policy_id, policy_version, eligible, requires_approval, matched_rules, permitted_action_types, stopping_reason)
      select $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8
      where not exists (select 1 from public.policy_evaluations where recovery_case_id = $1)
    `, [recoveryCaseId, policy.id, policy.version, snapshot.candidate.consentGranted, snapshot.state === "APPROVAL_PENDING", JSON.stringify(["SANDBOX_POLICY_SNAPSHOT"]), JSON.stringify(policy.permitted_action_types), snapshot.terminalReason]);

    if (snapshot.diagnosis) {
      await client.query(`
        insert into public.diagnoses (recovery_case_id, failure_cause, confidence_bps, evidence, explanation, recommended_action, uncertainty_reason, model_id, prompt_version)
        select $1, $2, $3, $4::jsonb, $5, $6, $7, $8, 'recoverflow-v1'
        where not exists (select 1 from public.diagnoses where recovery_case_id = $1)
      `, [recoveryCaseId, snapshot.diagnosis.failureCause, snapshot.diagnosis.confidenceBps, JSON.stringify(snapshot.diagnosis.evidence), snapshot.diagnosis.explanation, snapshot.diagnosis.recommendedAction, snapshot.diagnosis.uncertaintyReason ?? null, snapshot.diagnosis.modelId]);
    }

    if (snapshot.actionType) {
      const status = snapshot.state === "RECOVERED" ? "SUCCEEDED" : snapshot.state === "STOPPED" ? "SKIPPED" : snapshot.state === "AWAITING_OUTCOME" ? "DISPATCHED" : "PLANNED";
      await client.query(`
        insert into public.recovery_actions (recovery_case_id, action_type, status, idempotency_key, action_payload, attempt_number, provider_reference, expires_at, completed_at)
        values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
        on conflict (idempotency_key) do update set
          status = excluded.status,
          action_payload = excluded.action_payload,
          attempt_number = excluded.attempt_number,
          provider_reference = coalesce(excluded.provider_reference, public.recovery_actions.provider_reference),
          expires_at = coalesce(excluded.expires_at, public.recovery_actions.expires_at),
          completed_at = excluded.completed_at
      `, [recoveryCaseId, snapshot.actionType, status, `sandbox:${snapshot.caseReference}:${snapshot.actionType}`, JSON.stringify({ amountPaise: snapshot.candidate.amountPaise, customerIdentity: snapshot.candidate.customerIdentity }), snapshot.candidate.retryCount, snapshot.paymentLink?.providerReference ?? null, snapshot.paymentLink?.expiresAt ?? null, ["RECOVERED", "STOPPED", "EXCEPTION"].includes(snapshot.state) ? new Date() : null]);
    }

    if (snapshot.state === "APPROVAL_PENDING") {
      await client.query(`
        insert into public.approval_requests (recovery_case_id, recommended_action, rationale, expires_at)
        select $1, $2, $3, now() + interval '24 hours'
        where not exists (select 1 from public.approval_requests where recovery_case_id = $1 and status = 'PENDING')
      `, [recoveryCaseId, snapshot.actionType ?? "HUMAN_ESCALATION", "Sandbox policy requires merchant approval before action execution."]);
    } else if (snapshot.audit.some(item => item.event === "Approval granted")) {
      await client.query("update public.approval_requests set status = 'APPROVED', decided_at = coalesce(decided_at, now()), decision_reason = coalesce(decision_reason, 'Merchant approved the governed action.') where recovery_case_id = $1 and status = 'PENDING'", [recoveryCaseId]);
    } else if (snapshot.audit.some(item => item.event === "Approval rejected")) {
      await client.query("update public.approval_requests set status = 'REJECTED', decided_at = coalesce(decided_at, now()), decision_reason = coalesce(decision_reason, 'Merchant rejected the governed action.') where recovery_case_id = $1 and status = 'PENDING'", [recoveryCaseId]);
    }

    const audit = await client.query<{ sequence: number; entry_hash: string }>("select sequence, entry_hash from public.audit_entries where recovery_case_id = $1 order by sequence", [recoveryCaseId]);
    let previousHash = audit.rows.at(-1)?.entry_hash ?? null;
    let sequence = audit.rows.at(-1)?.sequence ?? 0;
    for (const item of snapshot.audit.slice(audit.rows.length)) {
      sequence += 1;
      const built = buildAuditEntry({ recoveryCaseId, actorType: item.actor as AuditActorType, eventType: item.event, payload: { detail: item.detail, time: item.time }, sequence, previousHash });
      await client.query(`
        insert into public.audit_entries (recovery_case_id, sequence, actor_type, event_type, payload, previous_hash, entry_hash)
        values ($1, $2, $3, $4, $5::jsonb, $6, $7)
      `, [recoveryCaseId, sequence, item.actor, item.event, built.payloadJson, previousHash, built.entryHash]);
      previousHash = built.entryHash;
    }

    return { merchantId: merchant.id, recoveryCaseId, policyVersion: policy.version };
  });
}

export async function getSupabasePersistedCaseOverrides(userId: string) {
  const configuredPool = getPool();
  if (!configuredPool) return new Map<string, PersistedCaseRow>();
  const result = await configuredPool.query<PersistedCaseRow>(`
    select rc.case_reference, rc.state, rc.terminal_reason,
      action.action_type, action.provider_reference, action.expires_at
    from public.recovery_cases rc
    join public.merchant_profiles merchant on merchant.id = rc.merchant_id
    left join lateral (
      select action_type, provider_reference, expires_at
      from public.recovery_actions
      where recovery_case_id = rc.id
      order by created_at desc
      limit 1
    ) action on true
    where merchant.user_id = $1
  `, [userId]);
  return new Map(result.rows.map(row => [row.case_reference, row]));
}

export async function getSupabaseActivePolicyForUser(user: SupabaseMerchantUser) {
  return withTransaction(async client => {
    const merchant = await ensureMerchant(client, user);
    const policy = await client.query<{
      version: number; auto_action_amount_cap_paise: number; max_retries: number; requires_consent: boolean;
      minimum_confidence_bps: number; reminder_max_contacts: number; eligible_failure_types: string[]; permitted_action_types: RecoveryActionType[];
    }>(`
      select version, auto_action_amount_cap_paise, max_retries, requires_consent,
        minimum_confidence_bps, reminder_max_contacts, eligible_failure_types, permitted_action_types
      from public.merchant_policies where merchant_id = $1 and is_active = true limit 1
    `, [merchant.id]);
    return policy.rows[0] ?? null;
  });
}

export async function createSupabaseMerchantPolicyVersion(user: SupabaseMerchantUser, input: {
  eligibleFailureTypes: RecoveryCandidate["failureType"][];
  permittedActionTypes: RecoveryActionType[];
  autoActionAmountCapPaise: number;
  maxRetries: number;
  requiresConsent: boolean;
  minimumConfidenceBps: number;
  reminderMaxContacts: number;
}) {
  return withTransaction(async client => {
    const merchant = await ensureMerchant(client, user);
    const current = await activePolicy(client, merchant.id);
    await client.query("update public.merchant_policies set is_active = false where merchant_id = $1", [merchant.id]);
    const next = await client.query<PolicyRow>(`
      insert into public.merchant_policies (
        merchant_id, version, name, is_active, eligible_failure_types, permitted_action_types,
        auto_action_amount_cap_paise, max_retries, requires_consent, minimum_confidence_bps,
        reminder_max_contacts, escalation_rules, stopping_conditions
      ) values ($1, $2, $3, true, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb)
      returning id, version, permitted_action_types
    `, [merchant.id, current.version + 1, `Guarded recovery policy v${current.version + 1}`, JSON.stringify(input.eligibleFailureTypes), JSON.stringify(input.permittedActionTypes), input.autoActionAmountCapPaise, input.maxRetries, input.requiresConsent, input.minimumConfidenceBps, input.reminderMaxContacts, JSON.stringify({ highValue: "APPROVAL", ambiguous: "APPROVAL", lowConfidence: "APPROVAL" }), JSON.stringify(["CONSENT_REQUIRED", "RETRY_LIMIT_REACHED", "PAYMENT_ALREADY_RESOLVED"])]);
    return next.rows[0] ?? null;
  });
}
