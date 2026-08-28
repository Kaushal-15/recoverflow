# Vercel Production Verification

## Verified production route

On 28 August 2026, the connected administrator browser opened `https://recoverflow-rho.vercel.app/dashboard` successfully. The session was authenticated as the provisioned RecoverFlow administrator, and the protected dashboard rendered the Supabase-backed recovery workspace.

## Evidence observed

The page displayed the RecoverFlow admin control plane with the recovery overview, review queue, recovery policy, evaluation navigation, and administrator identity. The overview loaded recovered revenue of ₹23,533, a 67.5% recovery rate, 100% action precision, and 0% exceptions. The recovery queue loaded 40/40 cases, including durable webhook, restart, and Supabase records. Merchant controls displayed a ₹500 automatic action cap, 80% minimum confidence, two maximum retry attempts, and required customer consent. The page also displayed the explicit sandbox label: “Razorpay Test Mode — no real money is moved.”

The live page initially showed “Loading recovery workspace…” and then resolved to the complete workspace after the API request finished, proving the repaired Vercel function reaches the Supabase-backed tRPC procedure and the authenticated dashboard can consume its response.

## Redeployment runbook

The repair was published by saving the project checkpoint, which synchronizes the connected GitHub `main` branch and triggers the connected Vercel deployment. After the deployment completes, verify the public tRPC boundary with:

```text
https://recoverflow-rho.vercel.app/api/trpc/recovery.overview?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D
```

An unauthenticated request should return structured tRPC JSON authorization output rather than an HTML function-crash page. Then open `/dashboard`, sign in with the provisioned Supabase administrator, and confirm that the recovery overview, queue, merchant controls, immutable audit trail, and event receipt ledger render.

Do not place service-role keys, Razorpay secrets, or administrator passwords in source control or client-side variables. The Vercel production environment must retain the server-only Supabase and Razorpay configuration described in the migration runbook.
