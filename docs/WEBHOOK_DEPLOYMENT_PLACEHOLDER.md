# Razorpay Test Mode Webhook — Deployment-Time Placeholder

## Purpose

RecoverFlow’s Payment Link and recovery-state logic are ready for signed Test Mode outcomes. The final webhook configuration is intentionally deferred until the app has a public deployed URL. This avoids configuring Razorpay against a temporary development address and keeps the buildathon demo truthful about what is active today.

> **Current status:** the Razorpay Test Mode Payment Link adapter has authenticated successfully. The `/api/webhooks/razorpay` handler, exact raw-body verification boundary, idempotent outcome processor, provider-reference mapping, and audit trail are implemented. The handler remains inactive until the deployment-time webhook secret is supplied.

## Deployment-time setup

| Step | Action | Expected result |
|---:|---|---|
| 1 | Publish the checkpoint in the project interface and copy the public HTTPS URL. | A stable public domain exists for Razorpay to call. |
| 2 | In Razorpay **Test Mode**, create a webhook using `<public-url>/api/webhooks/razorpay`. | Razorpay can deliver Test Mode Payment Link outcomes to RecoverFlow. |
| 3 | Select the relevant payment-link outcome events and save the webhook. | The Razorpay dashboard generates a webhook secret. |
| 4 | Add that value as server-only `RAZORPAY_WEBHOOK_SECRET` in the project’s secret settings. | The recovery handler can verify the exact raw event body. |
| 5 | Trigger a Test Mode Payment Link outcome and inspect the Event Receipt Ledger and immutable audit trail. | A verified result moves the correct recovery case through its idempotent outcome transition. |

## Safety behavior before activation

Until `RAZORPAY_WEBHOOK_SECRET` exists, RecoverFlow does not accept an external outcome as verified. This is deliberate: a Payment Link can be created and demonstrated in Test Mode, but the simulated in-app outcome remains visibly labeled as sandbox evidence. No unsigned request is allowed to change recovered revenue, policy state, or recovery status.

## Demonstration language

During the buildathon demo, describe this as a **deployment-time security control**, not an unfinished recovery design. The reviewer can see the accepted Payment Link path and the signed outcome boundary in the architecture, test suite, event receipt ledger, and recovery state machine. The only deferred input is the secret that Razorpay creates after the public endpoint exists.
