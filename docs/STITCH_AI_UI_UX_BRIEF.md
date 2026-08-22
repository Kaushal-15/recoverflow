# RecoverFlow — Stitch AI UI/UX Design Brief

## How to use this document

Paste the **Stitch AI master prompt** below into Stitch AI. If Stitch supports multi-screen generation, request all listed screens as one coherent web-app system. If it generates one screen at a time, begin with **Recovery Overview**, then generate the remaining screens using the same visual language and component rules.

The implementation may evolve, but the product model, safety constraints, exact manual-action wording, and Razorpay Test Mode labeling in this document are non-negotiable.

---

# Stitch AI Master Prompt

Design a premium, responsive B2B fintech web application named **RecoverFlow**. It is an **audit-grade AI payment-recovery control plane** for merchants using Razorpay. The product helps merchants recover eligible failed payments while retaining control over every exception. This is not a generic payment dashboard and not a chatbot. It should look like a serious modern control room for governed financial automation.

The central visual idea is **“policy-gated flow feeding an immutable ledger.”** Every important decision passes through a visible policy gate before it becomes an action, and every outcome becomes traceable evidence. Use this idea as a recurring motif in headers, status areas, audit trails, tables, and recovery workflows.

Create a complete desktop-first responsive interface with a collapsible left sidebar and a polished mobile version. Include the following screens:

1. Recovery Overview
2. Recovery Case Detail / Review Queue
3. Recovery Policy Controls
4. Evaluation and Evidence
5. Optional first-run / empty state for a merchant with no recovery events

The application must support **light mode and dark mode**. Dark mode should feel like an executive fintech operations console: deep ink navy, muted teal panels, crisp text, and restrained verified-state accents. Light mode should feel like a clinical mint workspace with dark ink headers, soft white cards, and disciplined financial-data hierarchy.

Never use fictional customer reviews, ratings, testimonials, social proof, vanity “trusted by” logos, or fake merchant quotes.

## Product and user context

RecoverFlow is used by a merchant operations lead, finance manager, payments lead, or revenue-recovery specialist. Their objectives are to:

- See revenue at risk from failed payments.
- Understand the likely failure reason and the evidence behind it.
- Let low-risk, policy-approved recovery actions proceed automatically.
- Review, approve, reject, or escalate high-value, low-confidence, ambiguous, or consent-sensitive cases.
- Configure clear recovery policy boundaries.
- Verify that the AI cannot change payment amount, customer identity, payment identity, consent rules, retry caps, or policy limits.
- Review immutable audit evidence and event receipts.
- Evaluate the recovery strategy against deterministic baselines.

The AI may recommend a recovery action only from a closed list: **no action, simulated retry, payment-link fallback, reminder, or human escalation**. The UI must make it clear that policy code—not the AI—enforces amounts, customer identity, consent, retry limits, approval requirements, and stopping conditions.

All Razorpay references must be clearly labeled **“Razorpay Test Mode”** or **“Sandbox”**. Do not imply that real money is moved in the demo. Use an honest label such as: **“Razorpay Test Mode — no real money is moved.”**

The exact manual action label must be: **“review/recover this payment”**. Preserve this text exactly, including lowercase styling if used on a button.

## Brand direction

### Personality

The product should feel:

- Governed, measured, and trustworthy.
- Technically capable without being intimidating.
- Modern and refined without looking like a generic SaaS template.
- Deliberately designed for financial operations, auditability, and merchant control.

Avoid loud gradients, cryptocurrency aesthetics, neon, glassmorphism overload, excessive rounded cards, overly playful illustrations, or generic “AI sparkle” graphics.

### Signature motif: policy gates and immutable ledgers

Use a subtle recurring visual grammar:

- **Policy gates:** thin vertical rails, discreet grid lines, directional flow marks, or small gate labels inside command headers. Labels can read: `POLICY GATE · VERIFY · ACT · RECORD`.
- **Immutable ledgers:** a narrow teal vertical evidence rail on audit cards, event receipts, and the winning baseline row; timestamped entries connected by a restrained line.
- **Verified states:** use restrained teal/emerald only for verified outcomes, approved policy paths, and active safe states.
- **Risk states:** amber for approval pending, rose/red for exception or rejected events, steel/slate for stopped or no-action states, and sky/cyan for awaiting a verified outcome.

### Recommended design tokens

| Token | Light mode | Dark mode | Intended use |
|---|---|---|---|
| Ink / command | `#071426` to `#0B1B32` | `#050B17` to `#0B1628` | Command headers, important action surfaces |
| Workspace | Pale clinical mint `#F2FBFA` | Deep blue-black `#061923` | Main page background |
| Teal verified | `#0F9F94` | `#25C2B4` | Policy-approved, recovered, verified evidence |
| Cyan system | `#0E7490` | `#47C7E9` | Ingestion, diagnostics, navigation highlights |
| Amber approval | `#B7791F` | `#F0B24C` | Approval-required states |
| Rose exception | `#C2415B` | `#FA7690` | Exceptions, rejected events, conflicts |
| Muted evidence | Cool gray-blue | Blue-gray | Secondary copy, timestamps, table metadata |

Use `DM Sans` or `Inter` for body and utility text. Use `Space Grotesk`, `Sora`, or another sharp enterprise grotesk for page titles and important financial numerals. Large numbers should feel like primary product objects, not secondary card labels.

## Global layout

### Sidebar

Create a collapsible left sidebar with:

- A strong RecoverFlow wordmark. Include a shield/check or controlled-flow icon, but avoid a generic standalone shield logo.
- Small label under the name: **CONTROL PLANE**.
- Navigation items: **Recovery overview**, **Review queue**, **Recovery policy**, and **Evaluation**.
- Distinct active state: muted teal fill, icon and text contrast, slight inset or track effect.
- Bottom merchant identity area with a generic initials avatar, merchant name, and **Sandbox workspace** status. Do not include social content.
- A light/dark theme control in the header or footer.

### Main workspace

Use generous responsive spacing, a 12-column desktop grid, and a single-column mobile layout. Do not use a generic centered landing-page hero. This is a functional internal operations tool.

Every route should begin with a recognizable **command-surface header**: dark ink/navy background, subtle policy-gate rails at the right, a small all-caps eyebrow label, and a direct business-level title. Keep these headers concise and not marketing-heavy.

## Screen 1 — Recovery Overview

### Command header

Create a dark command-surface banner with:

- Eyebrow: **CONTROLLED RECOVERY WORKSPACE**.
- Heading: **Recover revenue without giving up control.**
- Supporting statement: “Every recommended action is policy-gated, every exception remains merchant-controlled, and every decision is preserved in an immutable audit trail.”
- A compact status panel at the right: a green verified dot, **Sandbox active**, and “Razorpay Test Mode — no real money is moved.”
- Subtle policy-gate rail motif in the background, especially on the right third of the header.

### Key metrics

Show four metric cards with strong financial numerals and compact contextual copy:

| Metric | Example value | Supporting text | State |
|---|---:|---|---|
| Recovered revenue | `₹43,382` | `+11.2% vs. baseline` | Teal verified icon |
| Recovery rate | `56.2%` | `Held-out replay included` | Cyan chart icon |
| Action precision | `57.1%` | `Verified outcomes only` | Violet/teal document icon |
| Exceptions | `4%` | `₹248 false-positive cost` | Rose alert icon |

### Live recovery queue

The main table/card should be titled **“Actions with an explainable next step.”** Display 5–7 payment-recovery cases. Each row should show:

- Case identifier such as `RCV-1042`.
- Truncated customer identifier such as `customer@merchant.test`.
- At-risk amount.
- Failure diagnosis such as `TEMPORARY DECLINE`, `CUSTOMER FRICTION`, or `INSUFFICIENT CONTEXT`.
- Status badge: `INGESTED`, `APPROVAL PENDING`, `AWAITING OUTCOME`, `RECOVERED`, `STOPPED`, or `EXCEPTION`.
- A right-facing detail arrow.

Use deliberate risk colors. Rows should feel operational, not decorative. Selected rows have a restrained cyan/teal selection cue.

### Merchant controls summary

Show a side panel titled **“Autonomy stays inside policy.”** List:

- Automatic action cap: `₹500`.
- Minimum confidence: `80%`.
- Maximum retry attempts: `2 attempts`.
- Customer consent: `Required`.
- Closed action set: `SIMULATED RETRY`, `PAYMENT LINK FALLBACK`, `REMINDER`, `HUMAN ESCALATION`.

Use icons and compact divider lines. The design should reinforce that policy is merchant-owned.

### Evidence region

Below the queue, include two evidence panels with a visible vertical **immutable-ledger rail** on the left edge.

1. **Immutable audit trail** — title: “One recovery case, fully explainable.” Show a connected timestamped sequence: `payment.failed received` → `policy evaluation passed` → `diagnosis recorded` → `approval requested` → `action dispatched` → `outcome verified`.
2. **Event receipt ledger** — title: “Verified, duplicate, and rejected events.” Display accepted, duplicate, and rejected event receipts with timestamp, source event type, short reason, and status badge.

### Case detail panel

When a case is selected, show:

- Case ID, at-risk amount, diagnosis, confidence, risk route, customer identifier, and last update.
- An explanation panel stating why this case is action-ready, approval-required, or stopped.
- Exact primary button: **review/recover this payment**.
- If approval is pending, show two equal secondary actions: **Approve action** and **Reject and stop**.
- If awaiting outcome, show **Simulate verified outcome** and **Simulate expiry**, both visibly marked as sandbox-only.
- If a Payment Link exists, show provider reference and expiry in a compact `Razorpay Test Mode` note.

## Screen 2 — Review Queue / Case Detail

Create a review-focused route for merchant approvals and exceptions. Use a split layout on desktop and stacked cards on mobile.

### Left side: filterable case list

Include filters for status, risk route, failure type, amount band, and time period. Group cases into:

- **Requires merchant approval**
- **Action ready**
- **Stopped by policy**
- **Exceptions requiring human escalation**

Each row should visibly show the reason a case is in that queue. Never hide safety decisions behind vague AI confidence wording.

### Right side: governed decision detail

Use a structured decision narrative with these sections:

1. **Payment facts** — amount, payment ID, customer identifier. Mark these as immutable.
2. **Policy result** — applicable threshold, consent condition, confidence minimum, retry count, and whether each passed.
3. **Grounded diagnosis** — likely failure cause and concise evidence.
4. **Allowed action** — one of the closed action set; explain why no other action is permitted.
5. **Audit receipt** — actor, timestamp, idempotency key, and state transition.

For approval-required cases, the approval buttons should require deliberate interaction: a confirmation dialog or hold-to-confirm interaction for **Approve action**, with a fast reversible cancel. Do not make potentially consequential buttons visually casual.

## Screen 3 — Recovery Policy

This screen represents merchant ownership of the recovery system. It should feel like a policy console, not a generic settings page.

### Command header

- Eyebrow: **POLICY VERSION 1**.
- Heading: **Recovery policy**.
- Supporting copy: “This is the deterministic boundary around the agent. Updates apply only to future recovery plans in this sandbox workspace.”
- Status badge: **Active sandbox policy**.
- Use the policy-gate rail motif on the header.

### Controls

Use a structured 2-column grid of policy controls. Include clear helper text and permitted ranges.

| Control | Example | Behavior |
|---|---:|---|
| Automatic action cap | `₹500` | Higher-value cases require approval. |
| Minimum diagnosis confidence | `80%` | Lower-confidence cases pause for review. |
| Maximum retry attempts | `2` | Stops repeated recovery pressure. |
| Reminder contact limit | `2` | Prevents excessive customer follow-up. |
| Eligible failure types | Checkbox group | Only selected failure types can enter recovery. |
| Closed action set | Checkbox group | Only approved actions are available to orchestration. |
| Require recovery consent | Toggle/check | If enabled, customer-contact actions stop without consent. |

Add a button: **Save policy as next version**. The copy should clarify that existing recovery cases preserve the policy snapshot that governed them.

### Always-enforced stops

Add a side panel titled **“Always-enforced stops.”** It must show:

- Resolved payments — always stopped.
- High value or ambiguity — merchant approval required.
- Immutable fields — amount, customer, payment identity, and policy snapshot.

Add a visually distinctive teal safeguard panel titled **“Immutable action safeguards.”** Copy: “Amount, customer identity, payment identity, policy snapshot, and idempotency key are validated before an action can progress.”

## Screen 4 — Evaluation and Evidence

This screen must help reviewers understand that RecoverFlow is measured, not merely demonstrated.

### Command header

- Eyebrow: **REPRODUCIBLE EVIDENCE**.
- Heading: **Recovery evaluation**.
- Supporting statement: “A policy-gated evidence trail across a deterministic 200-record replay, with 40 records held out from tuning and fixed baseline comparators.”
- Include the policy-gate rail motif.

### Dataset cards

Show three compact cards:

- Dataset design: `200 records`, `160 development · 40 held-out`.
- Comparators: `3 baselines`, `No-action · retry-all · link-all`.
- Safety suite: `5 live scenarios`, `Duplicates, bad signatures, expiry, conflict, consent`.

### Metrics and integrity

Place a large evidence card beside a metric-integrity card.

The evidence card includes horizontal bars for:

- Recovery rate: `56.2%`.
- Action precision: `57.1%`.
- Stopping-rule compliance: `91.5%`.
- Exception visibility: `4%`.

The integrity card must explicitly state:

- Recovered revenue counts only a verified sandbox outcome, not an attempted action.
- False-positive cost captures avoidable contact or action burden.
- No cherry-picking: every batch record and exception appears in the run.
- **Razorpay Test Mode — Payment Link authentication is validated. These evaluation values remain controlled demo simulations until signed webhook events are configured.**

### Baseline comparison ledger

Use an evidence-table style, not a generic data table. Title: **“Explicit baseline comparison.”** Rows:

- No action
- Single retry
- Payment link
- RecoverFlow policy agent

Columns: recovered revenue, recovery rate, precision, false-positive cost, and actions.

The `RecoverFlow policy agent` row should have a muted green/teal ledger highlight and a narrow left evidence rail. The visual should communicate that the result is selected because it balances recovery and safety, not merely because it has the largest number.

### Interactive evidence tools

Include a card titled **“Run the shared batch-ingestion path.”** Supporting copy: “Feed 25 deterministic records through the same governed ingestion pipeline used by webhook-like events and manual review.” Button: **Process 25-record sandbox batch**.

Include a card titled **“Run a deliberate safety scenario.”** Use secondary buttons for: `duplicate event`, `invalid signature`, `expired link`, `conflicting outcome`, and `missing consent`.

When an action is triggered, show a concise result panel with readable contrast in both themes. Do not animate important results slowly; make safety outcomes immediate and clear.

## Screen 5 — Empty / onboarding state

If the merchant has no incoming failure events, show an onboarding state that explains:

1. Configure recovery policy.
2. Connect Razorpay Test Mode or replay the sample batch.
3. Review the governed outcomes and evidence.

Include a clear CTA to **Process 25-record sandbox batch** and a secondary CTA to open **Recovery policy**. The state should still look like an operations product, not a marketing landing page.

## Interaction and state requirements

| Situation | Required UI behavior |
|---|---|
| Low-risk, policy-approved case | Show action-ready state and constrained next action. |
| High-value, low-confidence, or ambiguous case | Show approval-required state; do not imply auto-execution. |
| Consent missing | Show a stopping reason before any reminder or link action. |
| Duplicate event | Show receipt as duplicate; no repeated recovery action. |
| Invalid signature | Show rejected receipt; no case or action created. |
| Expired payment link | Show terminal stop and reason. |
| Conflicting outcome | Show exception state and route to human escalation. |
| Real Payment Link unavailable | Show a labeled sandbox fallback, never an error that looks like a successful payment. |
| AI output invalid or low-confidence | Route to no-action or merchant review; never create a freeform payment action. |

## Accessibility and responsive requirements

- Maintain WCAG-conscious text contrast in both themes, especially on teal, emerald, amber, rose, and dark command surfaces.
- Use visible keyboard focus states.
- Do not rely on color alone for status; pair status colors with text labels and icons.
- Keep charts, policy helper text, table columns, and audit trail entries readable at 320–390px mobile widths.
- On mobile, transform complex tables into stacked evidence cards or preserve horizontal scrolling with a visible affordance.
- Keep the theme switcher accessible with a descriptive label such as “Switch to dark mode” or “Switch to light mode.”
- Use motion sparingly: 150–250ms opacity/transform transitions only; no long entrance animations for high-frequency operational elements. Respect reduced-motion settings.

## Non-negotiable product constraints

1. **The AI must never appear to change payment amount, customer identity, payment identity, policy limits, retry limits, consent requirements, or approval thresholds.**
2. **Show the exact manual action wording: “review/recover this payment.”**
3. **Label every Razorpay-related demo flow as Test Mode or Sandbox.**
4. **Do not fabricate actual customer testimonials, reviews, success stories, ratings, or merchant quotes.**
5. **Show safety stops and exceptions as intentional controls, not as UI failures.**
6. **Keep the product focused on payment-recovery governance, not generic AI chat.**

## Output requested from Stitch AI

Generate a polished, production-style responsive web app design with all screens described above. Reuse the same navigation, typography, tokens, policy-gate rails, immutable-ledger markers, component shapes, status badges, and interaction rules across every route. Deliver desktop and mobile variants, both light and dark modes, and include all functional states described in this brief.

---

# Condensed prompt for a single Stitch generation

> Design **RecoverFlow**, an audit-grade B2B fintech payment-recovery control plane for merchants using Razorpay Test Mode. It must feel like a governed financial operations console, not a generic SaaS dashboard or chatbot. Use a collapsible sidebar with RecoverFlow / CONTROL PLANE branding and pages for Recovery overview, Review queue, Recovery policy, and Evaluation. Create dark ink command headers with subtle vertical **policy-gate rails** labeled `POLICY GATE · VERIFY · ACT · RECORD`, and use teal left-edge **immutable-ledger rails** on audit and receipt evidence panels. Use clinical mint light mode and executive deep-navy dark mode, with persistent accessible theme controls. Include recovery metrics, an explainable queue, merchant policy controls, approval states, immutable audit trail, event receipt ledger, deterministic evaluation, and baseline comparison. Preserve the exact button text **“review/recover this payment”**. Always label Razorpay as **Test Mode / Sandbox**, never claim real money is moved, and make it clear that AI recommendations are restricted by deterministic policy controls. Never include reviews, testimonials, ratings, or generic marketing social proof.

## Current live-demo reference

The published reference instance is available at: `https://recoverflow-g7ogegt4.manus.space`.

Use it only as a functional reference. The desired Stitch output should retain the product behavior and safety language while improving compositional refinement, component consistency, and polished visual hierarchy.
