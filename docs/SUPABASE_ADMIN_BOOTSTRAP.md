# Supabase Admin Bootstrap and Vercel Handoff

## What Is Already Applied

The RecoverFlow Supabase Postgres schema, constraints, indexes, audit chain, webhook-receipt idempotency table, and row-level-security policies have been applied successfully. The project endpoint, publishable key, and transaction-pooler connection have also been validated from the server environment.

## Create the First Admin

In the Supabase Dashboard, open **Authentication → Users → Add user**. Create the user with the intended RecoverFlow administrator email and a strong password. Do not enable a public sign-up path in the application.

After the user exists, run this statement in the **SQL Editor**. It upgrades only that user’s profile to the role that can access the RecoverFlow dashboard.

```sql
update public.profiles
set role = 'admin'
where email = 'kaushalshanmugam15@gmail.com';
```

The database trigger creates the profile when the Auth user is created. You can confirm the change with:

```sql
select email, role
from public.profiles
where email = 'kaushalshanmugam15@gmail.com';
```

The result must show `admin` before sign-in can access `/dashboard`.

## Vercel Environment Variables

Set these values in **Vercel → Project Settings → Environment Variables** for Production and Preview. Keep all server-only values out of the `VITE_` prefix.

| Variable | Scope | Required now |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser-safe | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser-safe | Yes |
| `SUPABASE_DB_URL` | Server-only transaction-pooler URI | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Required before production Razorpay webhook persistence and automated admin provisioning |
| `RAZORPAY_KEY_ID` | Server-only | Yes for Test Mode Payment Link actions |
| `RAZORPAY_KEY_SECRET` | Server-only | Yes for Test Mode Payment Link actions |
| `RAZORPAY_WEBHOOK_SECRET` | Server-only | Yes for signed Razorpay webhooks |
| `RECOVERFLOW_ADMIN_EMAIL` | Server-only configuration | Recommended |

Deploy the repository with Vercel after those variables are set. The included `vercel.json` builds the Vite client and routes API traffic to the exported Express application. Configure Supabase Auth URL Configuration with the Vercel production URL and any Vercel preview URL patterns used for testing.

## Activation Status

The protected admin sign-in page, token verification, Supabase persistence repository, and server-only signed Razorpay webhook persistence are active and regression-tested. The service-role key now supports receipt idempotency and verified Payment Link outcome persistence only after HMAC validation. It must remain server-only and must never be supplied to the browser or committed to Git.
