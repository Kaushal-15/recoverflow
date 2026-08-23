-- RecoverFlow production schema for Supabase Postgres.
-- Apply in the Supabase SQL Editor after creating the initial admin user in Auth.

create extension if not exists pgcrypto;

create type public.app_role as enum ('user', 'admin');
create type public.recovery_source as enum ('WEBHOOK', 'BATCH', 'MANUAL');
create type public.signature_status as enum ('VERIFIED', 'NOT_APPLICABLE', 'INVALID', 'PENDING');
create type public.failure_type as enum ('TEMPORARY_DECLINE', 'CUSTOMER_FRICTION', 'INSUFFICIENT_CONTEXT', 'UNSUPPORTED');
create type public.recovery_case_state as enum ('RECEIVED', 'INGESTED', 'POLICY_EVALUATING', 'DIAGNOSING', 'ACTION_DECIDED', 'APPROVAL_PENDING', 'ACTION_QUEUED', 'ACTION_ATTEMPTED', 'AWAITING_OUTCOME', 'RECOVERED', 'STOPPED', 'EXCEPTION', 'REJECTED', 'DUPLICATE_IGNORED');
create type public.recovery_action_type as enum ('NO_ACTION', 'SIMULATED_RETRY', 'PAYMENT_LINK_FALLBACK', 'REMINDER', 'HUMAN_ESCALATION');
create type public.recovery_action_status as enum ('PLANNED', 'DISPATCHED', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'SKIPPED');
create type public.approval_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
create type public.audit_actor_type as enum ('SYSTEM', 'MERCHANT', 'RAZORPAY', 'AI');
create type public.receipt_processing_status as enum ('RECEIVED', 'REJECTED', 'DUPLICATE', 'PROCESSED', 'EXCEPTION');
create type public.evaluation_run_type as enum ('DEVELOPMENT', 'HELD_OUT', 'DEMO');
create type public.evaluation_run_status as enum ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
create type public.evaluation_comparator as enum ('NO_ACTION', 'SINGLE_RETRY', 'PAYMENT_LINK', 'RECOVERFLOW');
create type public.evaluation_split as enum ('DEVELOPMENT', 'HELD_OUT');
create type public.evaluation_outcome as enum ('RECOVERED', 'NOT_RECOVERED', 'FALSE_POSITIVE', 'EXCEPTION', 'STOPPED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

create table public.merchant_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete restrict,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger merchant_profiles_set_updated_at before update on public.merchant_profiles
  for each row execute procedure public.set_updated_at();

create table public.merchant_policies (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant_profiles(id) on delete restrict,
  version integer not null check (version > 0),
  name text not null,
  is_active boolean not null default true,
  eligible_failure_types jsonb not null,
  permitted_action_types jsonb not null,
  auto_action_amount_cap_paise bigint not null check (auto_action_amount_cap_paise > 0),
  max_retries integer not null check (max_retries between 0 and 5),
  requires_consent boolean not null default true,
  minimum_confidence_bps integer not null check (minimum_confidence_bps between 0 and 10000),
  reminder_max_contacts integer not null check (reminder_max_contacts between 0 and 5),
  escalation_rules jsonb not null,
  stopping_conditions jsonb not null,
  created_at timestamptz not null default now(),
  unique (merchant_id, version)
);
create unique index merchant_policies_one_active_per_merchant
  on public.merchant_policies (merchant_id) where is_active;

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant_profiles(id) on delete restrict,
  source_event_id text not null,
  source_type public.recovery_source not null,
  event_type text not null,
  raw_payload_digest char(64) not null,
  signature_status public.signature_status not null,
  external_payment_id text not null,
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR',
  customer_identity text not null,
  consent_granted boolean not null default false,
  failure_type public.failure_type not null,
  failure_code text,
  payload jsonb not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique (merchant_id, source_event_id)
);
create index payment_events_merchant_payment_idx on public.payment_events (merchant_id, external_payment_id);

create table public.recovery_cases (
  id uuid primary key default gen_random_uuid(),
  case_reference text not null unique,
  merchant_id uuid not null references public.merchant_profiles(id) on delete restrict,
  payment_event_id uuid not null unique references public.payment_events(id) on delete restrict,
  policy_id uuid not null references public.merchant_policies(id) on delete restrict,
  policy_version integer not null,
  source public.recovery_source not null,
  state public.recovery_case_state not null,
  amount_snapshot_paise bigint not null check (amount_snapshot_paise > 0),
  customer_identity_snapshot text not null,
  external_payment_id_snapshot text not null,
  retry_count integer not null default 0 check (retry_count >= 0),
  reminder_count integer not null default 0 check (reminder_count >= 0),
  risk_flags jsonb not null default '{}'::jsonb,
  terminal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger recovery_cases_set_updated_at before update on public.recovery_cases
  for each row execute procedure public.set_updated_at();
create index recovery_cases_queue_idx on public.recovery_cases (merchant_id, state, created_at desc);

create table public.policy_evaluations (
  id uuid primary key default gen_random_uuid(),
  recovery_case_id uuid not null references public.recovery_cases(id) on delete cascade,
  policy_id uuid not null references public.merchant_policies(id) on delete restrict,
  policy_version integer not null,
  eligible boolean not null,
  requires_approval boolean not null,
  matched_rules jsonb not null,
  permitted_action_types jsonb not null,
  stopping_reason text,
  created_at timestamptz not null default now()
);
create index policy_evaluations_case_idx on public.policy_evaluations (recovery_case_id, created_at desc);

create table public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  recovery_case_id uuid not null references public.recovery_cases(id) on delete cascade,
  failure_cause public.failure_type not null,
  confidence_bps integer not null check (confidence_bps between 0 and 10000),
  evidence jsonb not null,
  explanation text not null,
  recommended_action public.recovery_action_type not null,
  uncertainty_reason text,
  model_id text not null,
  prompt_version text not null,
  created_at timestamptz not null default now()
);
create index diagnoses_case_idx on public.diagnoses (recovery_case_id, created_at desc);

create table public.recovery_actions (
  id uuid primary key default gen_random_uuid(),
  recovery_case_id uuid not null references public.recovery_cases(id) on delete cascade,
  action_type public.recovery_action_type not null,
  status public.recovery_action_status not null,
  idempotency_key text not null unique,
  action_payload jsonb not null,
  attempt_number integer not null check (attempt_number >= 0),
  provider_reference text unique,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index recovery_actions_case_idx on public.recovery_actions (recovery_case_id, created_at desc);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  recovery_case_id uuid not null references public.recovery_cases(id) on delete cascade,
  recommended_action public.recovery_action_type not null,
  status public.approval_status not null default 'PENDING',
  rationale text not null,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_by_user_id uuid references public.profiles(id) on delete set null,
  decision_reason text,
  decided_at timestamptz
);
create index approval_requests_queue_idx on public.approval_requests (status, expires_at);

create table public.webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant_profiles(id) on delete restrict,
  source_event_id text not null,
  raw_payload_digest char(64) not null,
  signature_status public.signature_status not null,
  processing_status public.receipt_processing_status not null,
  received_at timestamptz not null default now(),
  unique (merchant_id, source_event_id)
);

create table public.audit_entries (
  id uuid primary key default gen_random_uuid(),
  recovery_case_id uuid not null references public.recovery_cases(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  actor_type public.audit_actor_type not null,
  event_type text not null,
  payload jsonb not null,
  previous_hash char(64),
  entry_hash char(64) not null unique,
  created_at timestamptz not null default now(),
  unique (recovery_case_id, sequence)
);
create index audit_entries_case_created_idx on public.audit_entries (recovery_case_id, created_at desc);

create table public.evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant_profiles(id) on delete restrict,
  policy_version integer not null,
  dataset_version text not null,
  seed integer not null,
  run_type public.evaluation_run_type not null,
  status public.evaluation_run_status not null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.evaluation_results (
  id uuid primary key default gen_random_uuid(),
  evaluation_run_id uuid not null references public.evaluation_runs(id) on delete cascade,
  recovery_case_id uuid references public.recovery_cases(id) on delete set null,
  comparator public.evaluation_comparator not null,
  split public.evaluation_split not null,
  outcome public.evaluation_outcome not null,
  recovered_amount_paise bigint not null default 0 check (recovered_amount_paise >= 0),
  false_positive_cost_paise bigint not null default 0 check (false_positive_cost_paise >= 0),
  exception_class text,
  created_at timestamptz not null default now()
);
create index evaluation_results_run_idx on public.evaluation_results (evaluation_run_id, comparator, split);

-- All operating data is private. The server service role bypasses RLS only after
-- verifying Razorpay signatures or Supabase admin sessions. Browser clients must be admins.
create function public.is_recoverflow_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_recoverflow_admin() to authenticated;

alter table public.profiles enable row level security;
create policy profiles_read_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_admin_manage on public.profiles for all to authenticated using (public.is_recoverflow_admin()) with check (public.is_recoverflow_admin());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'merchant_profiles', 'merchant_policies', 'payment_events', 'recovery_cases',
    'policy_evaluations', 'diagnoses', 'recovery_actions', 'approval_requests',
    'webhook_receipts', 'audit_entries', 'evaluation_runs', 'evaluation_results'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_recoverflow_admin()) with check (public.is_recoverflow_admin())', table_name || '_admins_only', table_name);
  end loop;
end;
$$;

-- After creating the user in Supabase Auth, promote it once using the SQL Editor:
-- update public.profiles set role = 'admin' where email = '<RECOVERFLOW_ADMIN_EMAIL>';
