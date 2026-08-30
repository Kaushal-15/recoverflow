# RecoverFlow — Senior Buildathon Hiring Review

## Executive assessment

RecoverFlow already demonstrates a stronger engineering story than a typical visual prototype: it has a real Supabase-backed control plane, Supabase Auth admin boundary, durable audit and webhook persistence, Razorpay Test Mode integration, state-machine hydration, policy constraints, idempotency, and regression coverage. The central product idea is credible: AI explains failed-payment signals, while merchant policy and approval boundaries decide what may happen.

The main selection risk is not the absence of features. It is **demo clarity and perceived speed**. A reviewer must understand the problem, see one recovery case move through the system, verify that the AI is constrained, and observe a durable outcome within a few minutes. If the landing page feels slow or the demo spends too long navigating a large dashboard, the strongest engineering work becomes invisible.

My hiring decision today would be: **strong shortlist potential, conditional on a tighter demo narrative and performance pass**. The project should be presented as governed payment-recovery infrastructure, not as a generic AI dashboard.

## What a senior reviewer expects

| Review dimension | What the reviewer wants to see | RecoverFlow position | Priority |
|---|---|---|---|
| Problem quality | A painful, measurable payment-recovery problem | Failed payments become explainable, policy-gated recovery cases | Strong |
| Product judgment | Clear boundaries on what is automated and what requires approval | Hybrid autonomy, merchant approval, closed action set, stopping reasons | Strong |
| AI quality | Grounded reasoning rather than an unconstrained chatbot | Structured diagnosis restricted to evidence and policy-approved actions | Strong |
| Payments safety | No unsafe mutation of amount, identity, or merchant controls | Immutable guardrails and Test Mode-only path | Strong |
| Production thinking | Durable state, retries, idempotency, auth, observability | Supabase persistence, signed webhook receipts, audit ledger, restart hydration | Strong |
| Demo communication | One obvious success path and one safe failure path | Present, but needs a guided narrative and faster entry | Needs polish |
| Performance | Fast first paint and responsive interaction | Improved through route splitting and rAF-based scroll updates; still needs real-device measurement | In progress |
| Differentiation | A memorable insight beyond “AI recovers payments” | Permission is the product: verify, act, record | Strong, should be emphasized |

## Selection-critical fixes

### 1. Make the first two minutes deterministic

The pitch should begin with one synthetic failed payment, not with a tour of every dashboard tab. Use a fixed demo case such as a temporary decline under the automatic action cap. Show the incoming Razorpay Test Mode event, the diagnosis, the policy gate, the approved action, the signed sandbox outcome, and the immutable audit event. The reviewer should see the entire control loop without needing to infer the intended path.

A second case should demonstrate a safe stop: a high-value or ambiguous payment that requires merchant approval or human escalation. This proves that RecoverFlow is not merely an auto-action engine and gives the reviewer a concrete safety moment.

### 2. Keep the AI claim narrow and provable

The strongest claim is not “the AI autonomously recovers payments.” The strongest claim is “the AI produces an evidence-backed diagnosis inside a merchant-defined action vocabulary; deterministic policy decides whether anything may happen.” Repeat this distinction in the pitch, UI, and README. Avoid adding a free-form chatbot unless it is directly grounded in the same case evidence and policy snapshot.

### 3. Make performance a visible product quality

The original public bundle was approximately 1.13 MB before compression. Protected dashboard pages are now lazy-loaded into separate chunks, with the largest initial client chunk reduced to approximately 919 kB and dashboard code split into dedicated chunks. The landing-page scroll listener now updates CSS variables inside `requestAnimationFrame` rather than re-rendering the full React page on every scroll event.

The next performance target should be measured on a real mobile device or throttled browser, not guessed from source size. Track first contentful paint, largest contentful paint, interaction to next paint, and whether the hero remains responsive while scrolling. If the page still feels heavy, reduce blur area and decorative layers before removing the core 3D scene.

### 4. Add one guided “Judge Mode” rather than many more features

A compact guided demo mode is the highest-value feature addition. It should provide three steps: **Signal received**, **Policy gate evaluated**, and **Outcome recorded**. Each step should point to the corresponding live case or dashboard panel and use the existing domain state. It must not create fake customer reviews, ratings, testimonials, or untracked outcomes.

Judge Mode should be optional, clearly labeled as a demonstration path, and use the existing synthetic/Test Mode data. It should never bypass approval, mutate policy limits, or imply that a sandbox event moved real money.

### 5. Strengthen reviewer evidence

Add a small “Why this is safe” surface near the main demo action with exactly three assertions: amount and identity are locked, merchant policy is authoritative, and every action/outcome is persisted. Link each assertion to the corresponding evidence panel. This turns the architecture into visible product behavior.

## What not to add before submission

Do not add a general-purpose AI chat panel, real-money production payment flows, customer-facing account creation, fabricated testimonials, elaborate analytics that are not tied to persisted records, or additional cloud infrastructure. These increase risk without improving the core evaluation story.

Do not add more 3D effects if the page becomes slower. The visual scene should function as a visual explanation of the recovery control loop, not as the product itself. A reviewer will forgive restrained motion; they will not forgive a demo that lags while trying to prove reliability.

## Recommended pitch structure

| Time | What to show | Message |
|---|---|---|
| 0:00–0:20 | Failed payment signal and problem statement | Failed payments are revenue leaks, but unsafe automation is worse |
| 0:20–0:50 | RecoverFlow control loop | AI diagnoses; policy gates; merchant approves exceptions |
| 0:50–1:20 | One successful Test Mode recovery | Signal → policy → bounded action → signed outcome → audit |
| 1:20–1:45 | One safe stop | High-risk or ambiguous cases remain merchant-controlled |
| 1:45–2:00 | Architecture and differentiator | Supabase durability, Razorpay webhook safety, Vercel deployment, immutable evidence |

## Final hiring recommendation

RecoverFlow should be submitted as a **governed recovery control plane for payment operations**. The project already contains the technical foundations that signal engineering maturity. The remaining work is to make those foundations immediately legible: fast first interaction, one guided end-to-end case, one visible safe-stop case, and a short explanation of why the AI cannot exceed merchant policy.

If those changes are demonstrated cleanly, the project has a credible shortlist narrative because it combines payments awareness, AI restraint, backend durability, security boundaries, and product judgment rather than presenting AI as an unbounded automation shortcut.
