# Supabase and Vercel Migration Plan

## Decision

RecoverFlow can move from the current project-managed MySQL and Manus OAuth boundaries to **Supabase Postgres** and **Supabase Auth**, then deploy its React client and Express API to **Vercel**. A separate cloud computer, Compute Engine VM, or always-on worker is not required for the present workload. Vercel supports Express applications as serverless functions, while Supabase provides the durable Postgres database and authentication service. [1] [2]

The application will remain a governed recovery control plane. The migration will not weaken the fixed amount, customer identity, payment identity, policy, idempotency, or audit constraints.

## Current-State Assessment

| Boundary | Current implementation | Migration action |
|---|---|---|
| Recovery runtime | In-memory sandbox store, with optional MySQL persistence after authenticated actions | Move case, policy, action, webhook receipt, and audit reads/writes to a Supabase-backed repository. |
| Database schema | MySQL Drizzle schema with merchant profiles, policies, events, cases, actions, approvals, receipts, audit entries, and evaluation data | Translate the schema to Postgres SQL with UUID identifiers, `jsonb` evidence fields, foreign keys, unique idempotency constraints, and indexes. |
| Dashboard access | Public routes with Manus OAuth-aware components | Add a Supabase Auth email/password admin sign-in page and protect all operating routes. |
| Webhook receiver | Express route with raw-body Razorpay HMAC validation | Keep raw-body HMAC validation server-side; persist verified receipts and outcomes through the Supabase service client. |
| Hosting | Long-lived Express entrypoint starts a local listener | Export the Express application for Vercel Functions and keep the Vite build as static client output. |

## Target Security Model

The public home page remains public. `/admin/login` becomes the only sign-in surface, and `/dashboard`, `/review-queue`, `/policy`, and `/evaluation` require an authenticated Supabase session with an **admin** role. There will be no public self-sign-up control.

The browser will receive only the Supabase project URL and publishable key. The Supabase service-role key, Postgres pooled connection URL, Razorpay API credentials, and webhook signing secret stay server-only. Supabase supports email/password sign-in through its client SDK; hosted projects can require email confirmation, and redirect URLs must be configured in the Supabase dashboard. [3]

On 23 August 2026, the provisioned admin account completed a real browser sign-in and loaded the protected RecoverFlow dashboard. A live Supabase persistence regression also wrote and reread a governed recovery state transition and its audit entries using the transaction pooler.

The authenticated dashboard has since been verified against the full Supabase query layer. It rendered non-seed persisted recovery cases, the active merchant policy including human escalation, immutable audit history, and signed webhook receipt history directly from Postgres. Those reads no longer depend on the in-memory fixture overview after a serverless restart.

The restart-safe mutation path was also exercised in the authenticated browser: after a fresh server start, a non-seed persisted case reloaded from Supabase in `AWAITING_OUTCOME`, accepted a simulated verified outcome, and refreshed to `RECOVERED` with the new immutable audit entry. This Test Mode verification moved no real money and contacted no customer.

Row-level security will restrict all merchant-owned rows to the authenticated merchant profile. Webhook ingestion will use a server-only service client after validating Razorpay’s HMAC signature, because Razorpay does not carry an end-user Supabase session.

## Required Supabase and Vercel Inputs

| Configuration | Visibility | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser-safe | Supabase project endpoint. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser-safe | Supabase Auth and row-level-security client access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Verified webhook ingestion and controlled administrative persistence. |
| `SUPABASE_DB_URL` | Server-only | Supabase transaction-pooler Postgres URI for Drizzle migrations and server-side repository queries. |
| `RECOVERFLOW_ADMIN_EMAIL` | Server-only configuration | The single initial admin identity to grant the `admin` role. |
| `VERCEL_URL` / production domain | Server configuration | Auth redirect and cookie-origin configuration. |

## Implementation Order

1. Create or select the Supabase project and configure the admin email/password user in Supabase Auth.
2. Apply the translated Postgres schema, role profile trigger, constraints, indexes, and row-level-security policies through the Supabase SQL Editor.
3. Add Supabase browser and server clients, then replace the MySQL/in-memory persistence writes with the Postgres repository.
4. Add `/admin/login`, a protected route guard, sign-out, and server-side authorization checks for all recovery mutations.
5. Restructure the Express entrypoint for Vercel, add deployment configuration, and set the environment variables in Vercel rather than in source control.
6. Verify email/password admin sign-in, protected operations, signed Razorpay events, payment-link outcomes, idempotency, and audit-chain persistence on a Vercel preview deployment.

## References

[1]: https://vercel.com/docs/frameworks/backend/express "Vercel — Express on Vercel"
[2]: https://supabase.com/partners/catalog/vercel "Supabase — Vercel integration"
[3]: https://supabase.com/docs/guides/auth/passwords "Supabase — Password-based Auth"
