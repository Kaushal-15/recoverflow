# RecoverFlow

**RecoverFlow** is an explainable payment-recovery control plane built for the Razorpay AI Buildathon’s **AI Revenue Recovery** track. It demonstrates how a merchant can recover eligible failed payments without handing an AI agent unrestricted authority over payments.

> **Razorpay Test Mode — Sandbox:** RecoverFlow uses an authenticated Test Mode Payment Link adapter while keeping recovery outcomes clearly labeled as sandbox evidence. No Live Mode request is made and no real money is moved.

## What the demo proves

| Capability | Demo implementation |
|---|---|
| Hybrid autonomy | Low-risk policy-approved cases are action-ready. High-value, low-confidence, and ambiguous cases require approval. Policy-blocked cases stop safely. |
| Bounded action set | The orchestrator accepts only `NO_ACTION`, `SIMULATED_RETRY`, `PAYMENT_LINK_FALLBACK`, `REMINDER`, and `HUMAN_ESCALATION`. |
| Immutable payment facts | Tests reject action commands that alter payment amount, customer identity, or payment identity. |
| Event-security boundary | Razorpay-style webhook HMAC verification uses the exact raw body; malformed or unsigned production events are rejected. |
| Test Mode adapter | The adapter has authenticated against Razorpay Test Mode and created a real sandbox Payment Link; simulation remains available for deterministic evaluation runs. |
| Merchant control | The dashboard displays policy boundaries, the review queue, exceptions, audit evidence, and the exact manual action **“review/recover this payment.”** |
| Reproducible evaluation | A deterministic synthetic batch contains 200 records with a fixed 160/40 development/held-out split and compares RecoverFlow to three baselines. |

## Architecture

The full HLD, LLD, state machine, API contracts, data model, safety invariants, test plan, and deployment choices are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

The core safety rule is simple: **the AI may produce a structured, grounded diagnosis and a recommendation, but deterministic policy code validates every executable command.** It cannot alter amounts, identities, policy thresholds, retry limits, or the allowed action set.

## Local run

```bash
pnpm dev
```

Open the local preview and use the sidebar to inspect the recovery workspace, review queue, policy view, and evaluator. Select a case from the overview and use **“review/recover this payment”** to view the governed plan. The demo intentionally shows whether the selected case is action-ready, approval-required, or stopped.

## Live-demo presentation controls

RecoverFlow includes a persistent light/dark theme control in the navigation shell. You can also open `?theme=dark` for a direct presentation-ready dark view. Its visual grammar is intentional: command headers expose **policy-gate rails**, while audit and receipt panels use **immutable-ledger markers** to make recovery governance visible before a reviewer reads the detail.

For a live demo, start at the recovery overview, keep the narrative on controlled automation, and follow [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md). A public URL is created by using the project interface’s **Publish** control after the final checkpoint.

## Validation

```bash
pnpm test
pnpm check
```

The Vitest suite covers policy decisions, consent and threshold stops, amount and customer-identity immutability, HMAC exact-body verification, idempotency-key stability, state transitions, sandbox-link expiry, deterministic dataset generation, fixed held-out split, and baseline metrics.

## Real Razorpay Test Mode activation

The application is designed so that real sandbox integration can be enabled without rewriting the recovery logic. `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are configured server-side and have validated the Test Mode Payment Link path. Add only `RAZORPAY_WEBHOOK_SECRET` when ready to configure `/api/webhooks/razorpay` in the Test Mode dashboard and validate signed payment outcomes end to end.

The webhook handler already enforces raw-body signature verification and labels the environment as sandbox-only. It deliberately returns a configuration response until a Test Mode webhook secret is supplied, preventing an unsigned event from masquerading as a valid payment outcome.

## Submission walkthrough

| Time | Screen | Reviewer signal |
|---:|---|---|
| 0:00–0:35 | Recovery overview | A clear revenue-at-risk problem and explicitly bounded autonomy |
| 0:35–1:20 | Merchant policy | Amount cap, consent, confidence, retry, and stopping conditions are deterministic |
| 1:20–2:10 | Select a low-risk case | The exact `review/recover this payment` path shows a governed action plan |
| 2:10–2:50 | Review queue | A high-value case pauses for merchant approval; an unconsented case stops safely |
| 2:50–3:30 | Audit trail | Payment event, policy check, diagnosis, constraint validation, and actor history are visible |
| 3:30–4:20 | Evaluation | 200-record replay, 40 held-out records, baselines, recovery rate, precision, exceptions, and stopping compliance |
| 4:20–5:00 | Architecture document and tests | Explain the raw-body signature boundary, immutable snapshots, idempotency, and deliberate failure scenarios |

## Current scope and deliberate limitations

The real Razorpay Test Mode adapter, signed raw-body webhook boundary, and durable merchant-policy/audit persistence are implemented behind configuration boundaries. The remaining external activation step is supplying the separate Test Mode webhook secret. Until that point, the application deliberately uses executable sandbox outcomes and never claims that a simulated outcome is live money recovery.
