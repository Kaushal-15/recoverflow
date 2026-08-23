import { createClient } from "@supabase/supabase-js";
import { Pool, type PoolClient } from "pg";
import { buildAuditEntry } from "../recovery/audit";
import { persistSandboxCaseForSupabaseUser } from "./supabaseRecoveryRepository";
import { getSandboxCaseForPersistence } from "../recovery/sandboxEngine";

type WebhookMerchant = { id: string; email: string; displayName: string | null; merchantId: string };
type ReceiptClaim = { duplicate: boolean; merchant: WebhookMerchant };

let pool: Pool | null = null;

function getPool() {
  const connectionString = process.env.SUPABASE_DB_URL ?? process.env.SUPABASE_MIGRATION_DB_URL;
  if (!connectionString) throw new Error("Supabase Postgres connection is not configured");
  if (!pool) pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 2, idleTimeoutMillis: 10_000 });
  return pool;
}

function serviceClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service-role webhook persistence is not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function isSupabaseWebhookPersistenceConfigured() {
  return Boolean(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.SUPABASE_DB_URL ?? process.env.SUPABASE_MIGRATION_DB_URL));
}

async function withTransaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
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

async function resolveWebhookMerchant(): Promise<WebhookMerchant> {
  const email = process.env.RECOVERFLOW_ADMIN_EMAIL;
  if (!email) throw new Error("RECOVERFLOW_ADMIN_EMAIL is required for webhook persistence");
  const { data, error } = await serviceClient()
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("email", email)
    .maybeSingle<{ id: string; email: string; display_name: string | null; role: string }>();
  if (error || !data || data.role !== "admin") throw new Error("Configured RecoverFlow webhook merchant is not an active Supabase admin");

  const merchant = await getPool().query<{ id: string }>(`
    insert into public.merchant_profiles (user_id, display_name)
    values ($1, $2)
    on conflict (user_id) do update set display_name = excluded.display_name, updated_at = now()
    returning id
  `, [data.id, data.display_name || data.email]);
  return { id: data.id, email: data.email, displayName: data.display_name, merchantId: merchant.rows[0]!.id };
}

export async function claimSupabaseWebhookReceipt(input: { sourceEventId: string; rawPayloadDigest: string }) : Promise<ReceiptClaim> {
  const merchant = await resolveWebhookMerchant();
  return withTransaction(async client => {
    const inserted = await client.query<{ id: string }>(`
      insert into public.webhook_receipts (merchant_id, source_event_id, raw_payload_digest, signature_status, processing_status)
      values ($1, $2, $3, 'VERIFIED', 'RECEIVED')
      on conflict (merchant_id, source_event_id) do nothing
      returning id
    `, [merchant.merchantId, input.sourceEventId, input.rawPayloadDigest]);
    if (!inserted.rows[0]) return { duplicate: true, merchant };
    return { duplicate: false, merchant };
  });
}

export async function markSupabaseWebhookReceipt(input: { merchantId: string; sourceEventId: string; status: "PROCESSED" | "REJECTED" | "DUPLICATE" | "EXCEPTION" }) {
  await getPool().query("update public.webhook_receipts set processing_status = $3 where merchant_id = $1 and source_event_id = $2", [input.merchantId, input.sourceEventId, input.status]);
}

export async function persistSupabaseWebhookFailure(input: { merchant: WebhookMerchant; caseId: string }) {
  return persistSandboxCaseForSupabaseUser({ id: input.merchant.id, email: input.merchant.email, name: input.merchant.displayName }, getSandboxCaseForPersistence(input.caseId));
}

export async function applySupabasePaymentLinkOutcome(input: { providerReference: string; event: "payment_link.paid" | "payment_link.expired" | "payment_link.partially_paid" }) {
  return withTransaction(async client => {
    const action = await client.query<{ recovery_case_id: string; recovery_state: string; case_reference: string; amount_snapshot_paise: number }>(`
      select action.recovery_case_id, recovery.state as recovery_state, recovery.case_reference, recovery.amount_snapshot_paise
      from public.recovery_actions action
      join public.recovery_cases recovery on recovery.id = action.recovery_case_id
      where action.provider_reference = $1
      order by action.created_at desc
      limit 1
    `, [input.providerReference]);
    const found = action.rows[0];
    if (!found) throw new Error("Unknown Razorpay Test Mode Payment Link reference.");

    const target = input.event === "payment_link.paid" ? "RECOVERED" : input.event === "payment_link.expired" ? "STOPPED" : "EXCEPTION";
    const terminalReason = target === "RECOVERED"
      ? "Verified Razorpay Test Mode Payment Link payment recorded once."
      : target === "STOPPED"
        ? "Verified Razorpay Test Mode Payment Link expiry recorded; no repeat action dispatched."
        : "Partial Payment Link outcome isolated for merchant review; no recovered revenue claimed.";
    const existingTerminal = ["RECOVERED", "STOPPED", "EXCEPTION"].includes(found.recovery_state);
    if (existingTerminal) return { state: found.recovery_state, idempotent: true, conflict: found.recovery_state !== target };

    await client.query("update public.recovery_cases set state = $2, terminal_reason = $3, updated_at = now() where id = $1", [found.recovery_case_id, target, terminalReason]);
    await client.query("update public.recovery_actions set status = $2, completed_at = now() where recovery_case_id = $1 and provider_reference = $3", [found.recovery_case_id, target === "RECOVERED" ? "SUCCEEDED" : target === "STOPPED" ? "EXPIRED" : "FAILED", input.providerReference]);

    const latest = await client.query<{ sequence: number; entry_hash: string }>("select sequence, entry_hash from public.audit_entries where recovery_case_id = $1 order by sequence desc limit 1", [found.recovery_case_id]);
    const sequence = (latest.rows[0]?.sequence ?? 0) + 1;
    const built = buildAuditEntry({ recoveryCaseId: found.recovery_case_id, sequence, actorType: "RAZORPAY", eventType: `Verified webhook outcome: ${input.event}`, payload: { providerReference: input.providerReference, target, terminalReason }, previousHash: latest.rows[0]?.entry_hash ?? null });
    await client.query("insert into public.audit_entries (recovery_case_id, sequence, actor_type, event_type, payload, previous_hash, entry_hash) values ($1, $2, 'RAZORPAY', $3, $4::jsonb, $5, $6)", [found.recovery_case_id, sequence, `Verified webhook outcome: ${input.event}`, built.payloadJson, latest.rows[0]?.entry_hash ?? null, built.entryHash]);
    return { state: target, idempotent: false, conflict: target === "EXCEPTION", caseReference: found.case_reference };
  });
}
