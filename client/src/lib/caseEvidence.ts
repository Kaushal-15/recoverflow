export type ReviewClass = "APPROVED" | "REJECTED" | "EXEMPTED" | "ESCALATED" | "PENDING" | "STOPPED";

export type SyntheticEvidence = {
  paymentMode: string;
  rail: string;
  maskedIp: string;
  device: string;
  region: string;
  issue: string;
  issueDetail: string;
  policyNote: string;
  reviews: { label: string; detail: string; actor: string; time: string; status: ReviewClass }[];
};

export const reviewStyle: Record<ReviewClass, string> = {
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  EXEMPTED: "border-violet-200 bg-violet-50 text-violet-700",
  ESCALATED: "border-amber-200 bg-amber-50 text-amber-700",
  PENDING: "border-sky-200 bg-sky-50 text-sky-700",
  STOPPED: "border-slate-200 bg-slate-100 text-slate-700",
};

const evidenceByCase: Record<string, SyntheticEvidence> = {
  "RCV-1042": { paymentMode: "UPI intent · Test Mode", rail: "Payment Link fallback", maskedIp: "203.0.113.42 · masked", device: "Android 14 · Chrome Mobile", region: "Synthetic Bengaluru region", issue: "Issuer-side temporary decline", issueDetail: "The sandbox issuer response indicates a transient decline. Customer identity, amount, and payment reference match the immutable recovery snapshot.", policyNote: "Within ₹500 auto-action cap, consent present, 92% diagnostic confidence, no retry cap breach.", reviews: [{ label: "Policy evaluation", detail: "All deterministic gates passed for a bounded payment-link fallback.", actor: "Policy engine", time: "10:42:10", status: "APPROVED" }, { label: "Recovery route", detail: "Payment Link fallback selected from the closed action set.", actor: "Orchestrator", time: "10:42:12", status: "APPROVED" }, { label: "Outcome receipt", detail: "Waiting for a signed Test Mode outcome or sandbox simulation.", actor: "Razorpay adapter", time: "10:42:13", status: "PENDING" }] },
  "RCV-1041": { paymentMode: "Card · Visa credit · Test Mode", rail: "Merchant approval", maskedIp: "198.51.100.84 · masked", device: "macOS · Safari 17", region: "Synthetic Mumbai region", issue: "Customer friction after authentication", issueDetail: "The customer abandoned the confirmation stage after an authentication step. The amount is above the merchant’s unattended-action threshold.", policyNote: "Amount exceeds ₹500 cap. The recovery action remains blocked until an authorized merchant reviewer decides.", reviews: [{ label: "Policy evaluation", detail: "Amount cap exceeded; automatic execution prevented.", actor: "Policy engine", time: "10:41:55", status: "EXEMPTED" }, { label: "Merchant review", detail: "A recovery route has been proposed and awaits an explicit merchant decision.", actor: "Recovery reviewer", time: "10:42:01", status: "PENDING" }, { label: "Recommended route", detail: "Human approval before any bounded payment-link or reminder action.", actor: "Orchestrator", time: "10:42:02", status: "ESCALATED" }] },
  "RCV-1038": { paymentMode: "Netbanking · Test Mode", rail: "No action", maskedIp: "192.0.2.19 · masked", device: "Windows 11 · Edge", region: "Synthetic Hyderabad region", issue: "Insufficient recovery context", issueDetail: "The source event does not provide enough verified context to distinguish a customer issue from a provider-side anomaly.", policyNote: "Confidence fell below the policy minimum. The customer is exempted from automated contact until a human resolves the ambiguity.", reviews: [{ label: "Evidence quality", detail: "Required failure context was incomplete; a freeform AI action is not permitted.", actor: "Diagnosis service", time: "10:39:20", status: "EXEMPTED" }, { label: "Policy stop", detail: "Automatic recovery stopped before any customer communication.", actor: "Policy engine", time: "10:39:21", status: "STOPPED" }, { label: "Human escalation", detail: "Case routed to an operator for source-event verification.", actor: "Recovery reviewer", time: "10:39:22", status: "ESCALATED" }] },
};

export function getSyntheticEvidence(caseId: string, state: string): SyntheticEvidence {
  if (evidenceByCase[caseId]) return evidenceByCase[caseId];
  const stateClass: ReviewClass = state === "RECOVERED" ? "APPROVED" : state === "STOPPED" ? "REJECTED" : state === "EXCEPTION" ? "EXEMPTED" : state === "APPROVAL_PENDING" ? "PENDING" : "APPROVED";
  return { paymentMode: "Wallet / card mix · Test Mode", rail: "Policy-governed route", maskedIp: "198.51.100.21 · masked", device: "Synthetic browser fingerprint", region: "Synthetic India region", issue: "Recoverable payment interruption", issueDetail: "This deterministic sandbox case represents a failed payment event with no real customer or device data.", policyNote: "The action path is constrained by the current merchant policy snapshot.", reviews: [{ label: "Recovery classification", detail: "The current case state is derived from the governed sandbox lifecycle.", actor: "Recovery engine", time: "10:40:00", status: stateClass }] };
}
