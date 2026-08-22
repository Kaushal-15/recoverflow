# RecoverFlow Five-Minute Demo Runbook

This runbook is deliberately written for a reviewer. It focuses on **observable proof**, not implementation claims.

## Pre-demo reset

Start the application and open the recovery overview. The workspace starts in **Razorpay Test Mode — Sandbox**. This wording is intentional: no real money movement, customer messaging, or live Razorpay call is claimed.

## Recommended sequence

| Time | Action | Proof shown |
|---:|---|---|
| 0:00–0:35 | Open **Recovery overview**. | The merchant problem, recovered revenue, recovery rate, action precision, exception rate, and sandbox status are visible immediately. |
| 0:35–1:10 | Open **Recovery policy**. Change a low-risk boundary if desired and save. | Merchant-owned policy controls version future decisions. Amount, identity, retry, consent, and action bounds remain immutable to AI. |
| 1:10–1:55 | Return to overview, select `RCV-1042`, then use **review/recover this payment**. | A low-risk, policy-approved case creates a constrained action and awaits a verified outcome. |
| 1:55–2:30 | Select `RCV-1041`. Approve or reject the pending action. | A high-value case cannot run unattended. Merchant approval produces the only path to action. |
| 2:30–3:05 | Open **Evaluation** and click **Process 25-record sandbox batch**. | Batch events feed the same governed engine used by manual and webhook-like events. Duplicates are prevented by source-event identity. |
| 3:05–3:45 | Click `invalid signature`, `duplicate event`, or `missing consent`. | Invalid inputs stop before ingestion, duplicate events do not create an action, and a missing-consent case stops before contact. |
| 3:45–4:25 | Show the baseline comparison table. | RecoverFlow is compared against no-action, retry-all, and link-all baselines across a deterministic 200-record simulation with a fixed 40-record held-out split. |
| 4:25–5:00 | Open `docs/ARCHITECTURE.md` and point to the state machine and invariants. | The build is structured around raw-body validation, idempotency, policy gates, immutable facts, human approvals, and audit evidence. |

## Deliberate failure results

| Scenario | Expected result |
|---|---|
| Invalid signature | Rejected before a recovery case exists. |
| Duplicate event | Existing source-event identity is returned; no second case or action is created. |
| Missing consent | Recovery stops before a reminder, link, or simulated retry can dispatch. |
| Expired link | Outcome becomes a terminal stop; a repeat action is not automatically sent. |
| Conflicting outcome | The state moves to an exception; no recovered revenue is counted. |

## Honest scope statement

The submission currently demonstrates an executable, credential-free Test Mode **simulation**. The real Razorpay Payment Links request and HMAC-authenticated webhook delivery can be enabled later by adding the Test Mode key ID, key secret, and webhook secret. The adapter and raw-body signature boundary are isolated so that enabling credentials does not change the recovery-policy, orchestration, or UI logic.
