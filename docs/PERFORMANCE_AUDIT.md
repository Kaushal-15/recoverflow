# RecoverFlow Performance Audit

## Changes applied

The public landing page no longer updates React state on every scroll event. It now schedules a single `requestAnimationFrame` update and writes bounded motion values directly to CSS custom properties on the payment scene and scroll-ledger console. This keeps the React tree stable while the GPU-facing transforms animate.

Protected routes are now lazy-loaded with React `Suspense`. The public entry no longer eagerly downloads the dashboard, review queue, policy, or evaluation page modules before a visitor asks to open them.

## Measured build evidence

The previous production build emitted a single initial JavaScript asset of approximately 1,129,049 bytes. After route splitting, the initial client chunk is approximately 919,070 bytes, a reduction of approximately 18.6% before compression. Dashboard-related code is now emitted into separate chunks, including approximately 73.9 kB for Dashboard, 86.6 kB for DashboardLayout, 24.9 kB for Evaluation, 18.3 kB for RecoveryPolicy, and 9.1 kB for ReviewQueue.

The Vite build continues to emit a chunk-size warning for the remaining shared initial chunk. This is a clear next optimization target, but it is not a reason to remove the core 3D identity before measuring on a real device.

## Browser verification

A Chromium reduced-motion run against the preview reported `prefers-reduced-motion: reduce`, `transform: none`, and `transition-duration: 0s` for the payment card, scroll-ledger console card, floating console node, and scene ring. The same run reported first paint at 512 ms and first contentful paint at 844 ms in the sandbox preview environment. These numbers are directional only; production field measurement should be performed on a throttled mobile profile before making absolute performance claims.

The optimized public landing page was visually rechecked at desktop and mobile sizes. The framed dark hero, layered Razorpay/Test Mode payment objects, permission core, recovery evidence badge, scroll-ledger narrative, and dashboard CTA remain intact. The protected `/dashboard` route continues to resolve to the administrator boundary rather than exposing the workspace publicly.

## Next measurement

Use a throttled mobile Lighthouse or Chrome Performance profile against the deployed URL. Record LCP, INP, CLS, total blocking time, and the first interaction latency while scrolling the hero. If the remaining lag is visible, reduce large blur radii and decorative backdrop filters before reducing the main payment scene.

## Live production demo-path evidence

The live URL `https://recoverflow-rho.vercel.app/dashboard` was opened in the authenticated administrator session after the performance work. The lazy dashboard resolved to the Supabase-backed workspace with 63/63 cases, merchant controls, sandbox labels, and durable recovery metrics. A representative `WEBHOOK-…` case was opened without mutation; its evidence panel displayed the Test Mode amount, recovered status, confidence, risk route, customer identifier, masked IP/region, synthetic device context, detected problem, policy reading, and the Razorpay Test Mode Payment Link outcome. Judge Mode was also launched on the preview and advanced through Signal, Gate, Act, and Record before exiting cleanly.

### Explicit post-deployment evidence

On the newly published Vercel release, the authenticated case detail displayed `PAYMENT MODE` as `Wallet / card mix · Test Mode`, `IP / REGION` as a masked synthetic region, `DEVICE CONTEXT` as a synthetic browser fingerprint, `PROBLEM DETECTED` as a recoverable payment interruption, and a `Policy reading` explaining that the action path is constrained by the merchant policy snapshot. The detail also showed the verified Test Mode Payment Link outcome and recovered status. This completes the production path evidence without executing a mutation.

### Audit-trail proof on the newly deployed release

The deployed dashboard’s selected-case content explicitly included `IMMUTABLE AUDIT TRAIL`, the bounded action set (`PAYMENT LINK FALLBACK`, `REMINDER`, and `HUMAN ESCALATION`), and `Verified webhook outcome: payment_link.paid` with a Razorpay actor/timestamp. This confirms the final audit/review evidence stage of the post-optimization production path.
