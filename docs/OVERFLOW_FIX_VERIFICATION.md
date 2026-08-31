# Landing Page Overflow Fix Verification

## Scope

This verification covers only the scoped hero-container change in `client/src/pages/Home.tsx`: `max-w-[calc(100vw-2rem)] overflow-x-hidden` was added to the existing hero frame. No padding, colors, fonts, component structure, or CTA behavior were changed.

## Evidence

At a 375 × 812 mobile viewport, the full-page render shows the hero heading wrapping as `Move / money / with / permission.`, the description wrapping inside the dark frame, all three hero actions remaining inside the frame width, and the feature checks (`Immutable evidence`, `Server-side credentials`, and `Test Mode only`) staying within the content column. No hero text or control crosses the right edge of the viewport.

At a 768 × 1024 tablet viewport, the framed hero remains centered with its rounded border and internal content contained inside the frame. The heading, description, CTA group, feature row, and 3D scene remain within the frame without horizontal clipping.

At a 1280 × 720 desktop viewport, the original wide framed composition remains intact: the rounded hero frame spans the available content width, the left narrative column and right 3D scene retain their existing arrangement, and the containment rule does not visibly alter desktop spacing or styling.

## Regression test

`pnpm test` passed with 57 tests passing and 1 intentional Razorpay integration test skipped.
