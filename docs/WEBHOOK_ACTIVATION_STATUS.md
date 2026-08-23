# Razorpay Test Mode Webhook Activation Status

## Receiver Readiness

RecoverFlow now exposes the signed Razorpay Test Mode receiver at:

`https://recoverflow-g7ogegt4.manus.space/api/webhooks/razorpay`

The receiver preserves the raw JSON request bytes and validates the `X-Razorpay-Signature` header with server-only HMAC-SHA256 verification. It accepts `payment.failed`, `payment_link.paid`, and `payment_link.expired`. A `payment_link.partially_paid` event is isolated as a review exception.

## Verification Result

On 23 August 2026, a safe Razorpay-shaped `payment.failed` payload signed with the configured server-only Test Mode webhook secret was posted to the public receiver. The receiver returned `202 Accepted`, confirmed the event source reference, and safely stopped recovery because the test payload contained no recovery consent. No real money movement or customer contact occurred.

## Razorpay Dashboard Configuration

The merchant confirmed the Razorpay Test Mode webhook was saved with the corrected receiver URL and signing secret. The recovery-relevant events are `payment.failed`, `payment_link.paid`, and `payment_link.expired`. The optional `payment_link.partially_paid` event is safe to include when exception visibility is desired.

After that confirmation, a second safe signed delivery to the public receiver returned `202 Accepted`. The Razorpay dashboard is now configured to deliver the selected Test Mode events to RecoverFlow. The next real Test Mode payment failure or Payment Link outcome will exercise the same verified receiver path.

## Merchant Configuration Evidence

The merchant provided an updated Razorpay Test Mode **Webhook Details** screenshot on 23 August 2026. The visible configuration matched the following values:

| Configuration field | Verified value |
|---|---|
| Webhook URL | `https://recoverflow-g7ogegt4.manus.space/api/webhooks/razorpay` |
| Status | Enabled |
| Secret | Provided during webhook setup |
| Active events | `payment.failed`, `payment_link.paid`, `payment_link.partially_paid`, `payment_link.expired` |

This configuration matches RecoverFlow’s signed receiver contract. The four selected events are intentionally supported: failed payments are evaluated for governed recovery, while payment-link payment, partial-payment, and expiry outcomes are recorded against the relevant Test Mode case.
