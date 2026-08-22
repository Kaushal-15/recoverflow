# Supabase Handoff — Post-Buildathon Migration Plan

## Decision for the live demo

RecoverFlow will use the **managed database already attached to this project** for the buildathon live demo. This keeps the policy engine, immutable audit tables, user access, recovery flows, evaluation dataset, and validated Razorpay Test Mode adapter on one working persistence path. It avoids a high-risk dual-database migration immediately before submission.

The live-demo URL therefore does **not** require Supabase. A future Supabase connection remains straightforward because the recovery domain is already organized into versioned policies, immutable payment snapshots, recovery cases, approvals, actions, audit entries, and evaluation records.

The application now also contains the server-side `server/persistence/recoveryRepository.ts` contract. It selects the managed database for the demo by default and can recognize a private `SUPABASE_DB_URL` as a migration handoff target without exposing the value to the browser or activating a second database.

## Future Supabase route

When a Supabase project is ready, connect only from the RecoverFlow server using a **server-side pooled Postgres connection string**. For a stateless or autoscaling web deployment, Supabase’s transaction pooler is the appropriate default; it is designed for temporary or serverless application connections. Direct connections are better reserved for migrations and long-lived backends. [1]

> Never expose a Supabase database password, service-role key, or pooled Postgres URI in browser code. Store the connection string as a server-only secret.

| Migration concern | Buildathon demo now | Future Supabase action |
|---|---|---|
| Runtime database | Existing project-managed relational database | Supabase Postgres via server-only pooled URI |
| Schema source of truth | `drizzle/schema.ts` plus reviewed migration SQL | Create Postgres-equivalent Drizzle schema and migrations; do not run MySQL migrations against Postgres |
| Application contract | Typed router and recovery services | Keep service contracts unchanged; swap only the repository implementation |
| Connection secret | Platform-provided database configuration | `SUPABASE_DB_URL` server secret using a pooled URI, SSL enabled |
| User access | Existing managed authentication context | Keep server-side authorization; introduce Supabase Row Level Security only after roles and tenant ownership are explicitly mapped |
| Deployment safety | One database, one migration path | Run an empty-project migration first, then import only approved demo data |

## Required future configuration

The migration should use the following **server-only** environment variable. The value must be obtained from the Supabase project’s Connect panel and must never be included in client code or committed to source control.

```text
SUPABASE_DB_URL=postgres://<pooled-user>:<password>@<region>.pooler.supabase.com:6543/postgres
```

Supabase documents the shared transaction pooler as the preferred connection method for temporary, serverless, or edge-style application traffic. Its Drizzle guide also demonstrates using a pooled URI with the Postgres-specific Drizzle driver and disabling prepared statements for transaction pooling. [1] [2]

## Implementation boundary

The future migration should follow these steps in a separate branch after the buildathon:

1. Add the Postgres Drizzle driver and a `server/persistence/supabase` repository implementation.
2. Translate the current MySQL Drizzle tables and indexes to Postgres types, retaining all recovery identifiers, idempotency keys, policy versions, and audit hashes.
3. Generate and review migrations against an empty Supabase project before any data import.
4. Add tenant-aware authorization and Row Level Security policies only after validating the existing `merchantId` ownership model.
5. Use dual-write only for a controlled migration window, compare audit hashes, then cut application reads to Supabase.

## What is intentionally not part of the demo

No Supabase key, URI, or client SDK is included in the buildathon deployment. The project should remain publishable and demonstrable without an additional external account. This is intentional risk control, not a missing feature.

## References

[1]: https://supabase.com/docs/guides/database/connecting-to-postgres "Supabase — Connect to your database"
[2]: https://supabase.com/docs/guides/database/drizzle "Supabase — Drizzle"
