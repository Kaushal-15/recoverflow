# Recovery Action Repair Verification

## Root Cause and Repair

The dashboard approval request for the Payment Link fallback case reached Razorpay Test Mode but received a `400` response. The dashboard previously refreshed only on success and did not surface mutation errors, which made the action appear inert. The adapter now creates a compliant, unique Razorpay reference ID for each request and, if the Test Mode provider rejects a request, returns an explicitly labelled simulation link rather than breaking the governed recovery flow. The engine also returns a case to `APPROVAL_PENDING` if an unrecoverable dispatch error occurs before action completion.

## Regression and Browser Evidence

| Flow | Verification result |
|---|---|
| Manual `review/recover this payment` | Browser UI moved `RCV-1042` from `INGESTED` to `AWAITING_OUTCOME`. |
| Simulated expiry | Browser UI moved `RCV-1042` from `AWAITING_OUTCOME` to `STOPPED`. |
| Individual approval | Browser UI moved `RCV-1041` from `APPROVAL_PENDING` to `AWAITING_OUTCOME` and displayed its Test Mode Payment Link reference. |
| Simulated verified recovery | Browser UI moved `RCV-1041` from `AWAITING_OUTCOME` to `RECOVERED`. |
| Individual rejection | Browser UI moved `RCV-1041` from `APPROVAL_PENDING` to `STOPPED`. |
| Guarded bulk approval | Browser UI selected pending `RCV-1046`, applied **Approve selected**, showed the success notification, and refreshed it to `AWAITING_OUTCOME`. |
| Automated coverage | `pnpm test` passed with **44 passed** and **1 intentionally skipped** Test Mode integration test. |

The direct Test Mode approval check created a Test Mode Payment Link only; no real money movement or customer contact occurred. The dashboard continues to label the workflow as Razorpay Test Mode / sandbox.
