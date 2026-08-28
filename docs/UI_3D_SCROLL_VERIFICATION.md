# 3D Scroll UI Verification Notes

## Scope

The public `/` route was reviewed after the cinematic 3D scroll refinement at 1440×900 desktop, 768×1024 tablet, and 390×844 mobile viewports. The existing `/dashboard` route was also opened to confirm the protected auth boundary remains in place.

## Observed results

The desktop view shows the framed dark hero, layered Razorpay/Test Mode and RecoverFlow payment cards, permission core, recovery evidence badge, progress rail, and the additional scroll-ledger console with floating Signal, Gate, Act, and Record nodes. The tablet view changes the feature grid and scene proportions without visible clipping. The mobile view stacks the narrative, scales the payment scene down, and keeps the CTA, Test Mode labels, step cards, console, and footer inside the viewport width without horizontal overflow.

After the cinematic refinement, both `/dashboard` and `/admin/login` were reopened at 1280×720. Each route presented the protected Supabase administrator sign-in screen rather than exposing dashboard content publicly. This confirms the authentication boundary remains intact after the landing-page changes.

The reduced-motion fallback is defined for the payment cards, scene core, progress rail, console nodes, console card, step cards, feature cards, rings, and scene grid. Browser-level reduced-motion emulation confirmed `prefers-reduced-motion: reduce`, `transform: none` for the payment card, console card, and console node, and `transition-duration: 0s`.
