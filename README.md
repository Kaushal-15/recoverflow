# RecoverFlow

**RecoverFlow** is an explainable payment-recovery control plane built for the Razorpay AI Buildathon’s **AI Revenue Recovery** track. It demonstrates how a merchant can recover eligible failed payments without handing an AI agent unrestricted authority over payments.

> **Razorpay Test Mode — Sandbox:** this project currently runs in a credential-free simulation mode. No real money is moved, no real customer is contacted, and no production Razorpay account is required to run the demo.

## What the demo proves

| Capability | Demo implementation |
|---|---|
| Hybrid autonomy | Low-risk policy-approved cases are action-ready. High-value, low-confidence, and ambiguous cases require approval. Policy-blocked cases stop safely. |
| Bounded action set | The orchestrator accepts only `NO_ACTION`, `SIMULATED_RETRY`, `PAYMENT_LINK_FALLBACK`, `REMINDER`, and `HUMAN_ESCALATION`. |
| Immutable payment facts | Tests reject action commands that alter payment amount, customer identity, or payment identity. |
| Event-security boundary | Razorpay-style webhook HMAC verification uses the exact raw body; malformed or unsigned production events are rejected. |
| Test Mode adapter | A simulated Payment Link adapter returns a sandbox link, expiry, stable provider reference, and idempotency key. |
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

## Validation

```bash
pnpm test
pnpm check
```

The Vitest suite covers policy decisions, consent and threshold stops, amount and customer-identity immutability, HMAC exact-body verification, idempotency-key stability, state transitions, sandbox-link expiry, deterministic dataset generation, fixed held-out split, and baseline metrics.

## Real Razorpay Test Mode activation

The application is designed so that real sandbox integration can be enabled without rewriting the recovery logic. When credentials are available, add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` as server-side secrets. Then complete the isolated adapter by replacing the simulated provider request with the Razorpay Test Mode Payment Links API and configure the `/api/webhooks/razorpay` endpoint in the Test Mode dashboard.

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

The live Razorpay Test Mode request and signed webhook receipt persistence are intentionally left pending until credentials are available. This keeps the demo honest: it demonstrates executable sandbox approvals, outcomes, failure scenarios, and testable safety controls without claiming that simulated outcomes are live money recovery.
