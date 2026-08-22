import type { RecoveryActionType, RecoveryCandidate, RecoveryCaseState } from "../../shared/recovery";
import { deterministicDiagnosis, diagnoseWithGroundedAI, type GroundedDiagnosis } from "./diagnosis";
import { planRecovery } from "./orchestrator";
import { createConfiguredPaymentLinkAdapter, type SandboxPaymentLink } from "./paymentLinkAdapter";
import { demoPolicy as defaultDemoPolicy } from "./simulator";
import { canApplyVerifiedOutcome, isTerminalState } from "./stateMachine";

type SandboxAuditEntry = { time: string; actor: "RAZORPAY" | "SYSTEM" | "AI" | "MERCHANT"; event: string; detail: string };
type SandboxReceipt = { sourceEventId: string; eventType: string; status: "PROCESSED" | "DUPLICATE" | "REJECTED" | "EXCEPTION"; detail: string; time: string };
type SandboxCase = {
  id: string;
  candidate: RecoveryCandidate;
  state: RecoveryCaseState;
  actionType: RecoveryActionType | null;
  reason: string;
  risk: string;
  updatedAt: string;
  audit: SandboxAuditEntry[];
  paymentLink: SandboxPaymentLink | null;
  diagnosis: GroundedDiagnosis | null;
};

const store = new Map<string, SandboxCase>();
const sourceEventIndex = new Map<string, string>();
const providerReferenceIndex = new Map<string, string>();
const receipts: SandboxReceipt[] = [];
const adapter = createConfiguredPaymentLinkAdapter();
let activePolicy = { ...defaultDemoPolicy, eligibleFailureTypes: [...defaultDemoPolicy.eligibleFailureTypes], permittedActionTypes: [...defaultDemoPolicy.permittedActionTypes] };
let policyVersion = 1;

export function resetSandboxStore() {
  store.clear();
  sourceEventIndex.clear();
  providerReferenceIndex.clear();
  receipts.length = 0;
  activePolicy = { ...defaultDemoPolicy, eligibleFailureTypes: [...defaultDemoPolicy.eligibleFailureTypes], permittedActionTypes: [...defaultDemoPolicy.permittedActionTypes] };
  policyVersion = 1;
}

export function getSandboxPolicy() {
  return { ...activePolicy, eligibleFailureTypes: [...activePolicy.eligibleFailureTypes], permittedActionTypes: [...activePolicy.permittedActionTypes], version: policyVersion };
}

export function updateSandboxPolicy(input: Pick<typeof activePolicy, "eligibleFailureTypes" | "permittedActionTypes" | "autoActionAmountCapPaise" | "maxRetries" | "requiresConsent" | "minimumConfidenceBps" | "reminderMaxContacts">) {
  activePolicy = { ...activePolicy, ...input, eligibleFailureTypes: [...input.eligibleFailureTypes], permittedActionTypes: [...input.permittedActionTypes] };
  policyVersion += 1;
  return getSandboxPolicy();
}

function now() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function seedCase(input: Omit<SandboxCase, "audit" | "paymentLink" | "updatedAt" | "diagnosis"> & { audit?: SandboxAuditEntry[] }): SandboxCase {
  return { ...input, updatedAt: "just now", audit: input.audit ?? [], paymentLink: null, diagnosis: null };
}

function resetIfNeeded() {
  if (store.size) return;
  const entries: SandboxCase[] = [
    seedCase({
      id: "RCV-1042",
      state: "INGESTED",
      actionType: null,
      reason: "Verified Test Mode failure is eligible for a bounded recovery plan.",
      risk: "Low",
      candidate: candidate("customer@merchant.test", "pay_rcv_1042", 48_600, "TEMPORARY_DECLINE", true, 9_200),
      audit: [{ time: "10:42:09", actor: "RAZORPAY", event: "payment.failed received", detail: "Sandbox event receipt validated before recovery evaluation." }],
    }),
    seedCase({
      id: "RCV-1041",
      state: "APPROVAL_PENDING",
      actionType: "PAYMENT_LINK_FALLBACK",
      reason: "Amount exceeds the ₹500 automatic-action cap. Merchant approval is required.",
      risk: "Merchant review",
      candidate: candidate("buyer@merchant.test", "pay_rcv_1041", 132_500, "CUSTOMER_FRICTION", true, 7_600),
    }),
    seedCase({
      id: "RCV-1043",
      state: "INGESTED",
      actionType: null,
      reason: "A customer-friction case is eligible for a bounded reminder after one prior attempt.",
      risk: "Low",
      candidate: { ...candidate("customer4@merchant.test", "pay_rcv_1043", 32_000, "CUSTOMER_FRICTION", true, 8_700), retryCount: 1 },
    }),
    seedCase({
      id: "RCV-1040",
      state: "STOPPED",
      actionType: "NO_ACTION",
      reason: "Recovery consent is not available. No customer contact was attempted.",
      risk: "Stopped safely",
      candidate: candidate("contact_9084", "pay_rcv_1040", 21_900, "TEMPORARY_DECLINE", false, 8_800),
    }),
    seedCase({
      id: "RCV-1039",
      state: "RECOVERED",
      actionType: "PAYMENT_LINK_FALLBACK",
      reason: "Sandbox Payment Link outcome was verified once and the case is terminal.",
      risk: "Recovered",
      candidate: candidate("customer2@merchant.test", "pay_rcv_1039", 79_900, "CUSTOMER_FRICTION", true, 9_000),
    }),
    seedCase({
      id: "RCV-1038",
      state: "EXCEPTION",
      actionType: null,
      reason: "Conflicting duplicate outcome is held for merchant review; recovery is not counted.",
      risk: "Exception",
      candidate: candidate("customer3@merchant.test", "pay_rcv_1038", 18_000, "INSUFFICIENT_CONTEXT", true, 5_400, true),
    }),
  ];
  entries.forEach(entry => {
    store.set(entry.id, entry);
    sourceEventIndex.set(`seed_${entry.id}`, entry.id);
  });
}

function candidate(customerIdentity: string, externalPaymentId: string, amountPaise: number, failureType: RecoveryCandidate["failureType"], consentGranted: boolean, confidenceBps: number, isAmbiguous = false): RecoveryCandidate {
  return { amountPaise, customerIdentity, externalPaymentId, failureType, consentGranted, retryCount: 0, reminderCount: 0, confidenceBps, isAmbiguous, hasRiskFlag: false, alreadyResolved: false };
}

function addAudit(item: SandboxCase, actor: SandboxAuditEntry["actor"], event: string, detail: string) {
  item.audit.push({ time: now(), actor, event, detail });
  item.updatedAt = "just now";
}

function displayCase(item: SandboxCase) {
  return {
    id: item.id,
    customer: item.candidate.customerIdentity,
    amountPaise: item.candidate.amountPaise,
    state: item.state,
    failureType: item.candidate.failureType,
    confidence: Math.round(item.candidate.confidenceBps / 100),
    reason: item.reason,
    updatedAt: item.updatedAt,
    risk: item.risk,
    actionType: item.actionType,
    paymentLink: item.paymentLink,
  };
}

export function getSandboxSnapshot(selectedCaseId = "RCV-1042") {
  resetIfNeeded();
  const selected = store.get(selectedCaseId) ?? store.get("RCV-1042")!;
  return { cases: Array.from(store.values()).map(displayCase), audit: selected.audit.slice(-8).reverse(), receipts: receipts.slice(-8).reverse() };
}

export function getSandboxCaseForPersistence(caseId: string) {
  resetIfNeeded();
  const item = requireCase(caseId);
  return {
    caseReference: item.id,
    sourceEventId: `sandbox:${item.id}`,
    state: item.state,
    actionType: item.actionType,
    terminalReason: isTerminalState(item.state) ? item.reason : null,
    candidate: item.candidate,
    paymentLink: item.paymentLink,
    diagnosis: item.diagnosis,
    audit: [...item.audit],
  };
}

export async function runManualRecovery(caseId: string) {
  resetIfNeeded();
  const item = requireCase(caseId);
  if (isTerminalState(item.state)) return response(item, "STOPPED", null, "TERMINAL_CASE_CANNOT_BE_REOPENED");

  addAudit(item, "MERCHANT", "review/recover this payment", "Merchant initiated a governed review; policy limits remain locked.");
  return processGovernedCase(item, "MANUAL");
}

export async function ingestSandboxEvent(input: {
  sourceEventId: string;
  externalPaymentId: string;
  amountPaise: number;
  customerIdentity: string;
  failureType: RecoveryCandidate["failureType"];
  consentGranted: boolean;
  confidenceBps?: number;
  retryCount?: number;
}) {
  resetIfNeeded();
  const existingCaseId = sourceEventIndex.get(input.sourceEventId);
  if (existingCaseId) {
    receipts.push({ sourceEventId: input.sourceEventId, eventType: "payment.failed", status: "DUPLICATE", detail: "Existing source-event identity prevented a second case and action.", time: now() });
    return { duplicate: true, case: displayCase(requireCase(existingCaseId)) };
  }
  const id = `RCV-${String(1100 + store.size + 1)}`;
  const item = seedCase({
    id,
    state: "RECEIVED",
    actionType: null,
    reason: "Verified sandbox event received for governed recovery evaluation.",
    risk: "Pending",
    candidate: {
      amountPaise: input.amountPaise,
      customerIdentity: input.customerIdentity,
      externalPaymentId: input.externalPaymentId,
      failureType: input.failureType,
      consentGranted: input.consentGranted,
      retryCount: input.retryCount ?? 0,
      reminderCount: 0,
      confidenceBps: input.confidenceBps ?? 8_900,
      isAmbiguous: input.failureType === "INSUFFICIENT_CONTEXT" || input.failureType === "UNSUPPORTED",
      hasRiskFlag: false,
      alreadyResolved: false,
    },
  });
  store.set(id, item);
  sourceEventIndex.set(input.sourceEventId, id);
  addAudit(item, "RAZORPAY", "payment.failed received", `Verified sandbox event ${input.sourceEventId} accepted exactly once.`);
  const result = await processGovernedCase(item, "WEBHOOK");
  receipts.push({ sourceEventId: input.sourceEventId, eventType: "payment.failed", status: result.plan.outcome === "STOPPED" ? "EXCEPTION" : "PROCESSED", detail: `Recovery ${result.plan.outcome.toLowerCase().replaceAll("_", " ")}.`, time: now() });
  return { duplicate: false, ...result };
}

export async function ingestSandboxBatch(records: Array<{
  sourceEventId: string;
  externalPaymentId: string;
  amountPaise: number;
  customerIdentity: string;
  failureType: RecoveryCandidate["failureType"];
  consentGranted: boolean;
  confidenceBps: number;
  retryCount: number;
}>) {
  const results = [];
  for (const record of records) results.push(await ingestSandboxEvent(record));
  return { processed: results.filter(item => !item.duplicate).length, duplicates: results.filter(item => item.duplicate).length, results };
}

async function processGovernedCase(item: SandboxCase, source: "MANUAL" | "WEBHOOK") {
  item.state = "POLICY_EVALUATING";
  const preflight = planRecovery({ policy: activePolicy, candidate: item.candidate, caseReference: item.id });
  addAudit(item, "SYSTEM", "Policy evaluation", `Rules: ${preflight.policyRules.join(", ") || "none"} · outcome ${preflight.outcome}${preflight.stoppingReason ? ` · ${preflight.stoppingReason}` : ""}`);
  const diagnosis = source === "MANUAL" && process.env.NODE_ENV !== "test" && !process.env.VITEST
    ? await diagnoseWithGroundedAI({ candidate: item.candidate, permittedActions: activePolicy.permittedActionTypes })
    : deterministicDiagnosis(item.candidate, activePolicy.permittedActionTypes);
  item.diagnosis = diagnosis;
  const plan = planRecovery({ policy: activePolicy, candidate: item.candidate, diagnosis, caseReference: item.id });
  addAudit(item, "AI", "Grounded diagnosis", `${diagnosis.failureCause.replaceAll("_", " ")} · ${Math.round(diagnosis.confidenceBps / 100)}% confidence · ${diagnosis.recommendedAction.replaceAll("_", " ")} · ${diagnosis.modelId} · source ${source.toLowerCase()}`);

  if (plan.outcome === "STOPPED") {
    item.state = "STOPPED";
    item.actionType = "NO_ACTION";
    item.reason = plan.stoppingReason ?? "No recovery action is permitted.";
    item.risk = "Stopped safely";
    addAudit(item, "SYSTEM", "Recovery stopped", item.reason);
    return response(item, plan.outcome, plan.action, item.reason);
  }

  item.actionType = plan.action?.actionType ?? null;
  if (plan.outcome === "APPROVAL_REQUIRED") {
    item.state = "APPROVAL_PENDING";
    item.reason = "Policy requires merchant approval before this action can run.";
    item.risk = "Merchant review";
    addAudit(item, "SYSTEM", "Approval requested", "High-value, low-confidence, or ambiguous recovery cannot run unattended.");
    return response(item, plan.outcome, plan.action, null);
  }

  await executeAction(item, plan.action!.actionType, plan.action!);
  return response(item, plan.outcome, plan.action, null);
}

export async function decideSandboxApproval(caseId: string, decision: "APPROVE" | "REJECT") {
  resetIfNeeded();
  const item = requireCase(caseId);
  if (item.state !== "APPROVAL_PENDING") throw new Error("This case is not awaiting merchant approval.");
  if (decision === "REJECT") {
    item.state = "STOPPED";
    item.reason = "Merchant rejected the proposed recovery action.";
    item.risk = "Stopped safely";
    addAudit(item, "MERCHANT", "Approval rejected", item.reason);
    return displayCase(item);
  }
  const plan = planRecovery({ policy: activePolicy, candidate: item.candidate, caseReference: item.id });
  if (!plan.action) throw new Error("No policy-approved action exists.");
  addAudit(item, "MERCHANT", "Approval granted", `Merchant approved ${plan.action.actionType.replaceAll("_", " ")}.`);
  await executeAction(item, plan.action.actionType, plan.action);
  return displayCase(item);
}

export function applySandboxOutcome(caseId: string, outcome: "RECOVERED" | "EXPIRED" | "CONFLICT") {
  resetIfNeeded();
  const item = requireCase(caseId);
  if (isTerminalState(item.state)) {
    if (outcome === "CONFLICT") {
      item.state = "EXCEPTION";
      item.reason = "A conflicting terminal callback was isolated for merchant review.";
      item.risk = "Exception";
      addAudit(item, "RAZORPAY", "Conflicting callback isolated", "No recovered revenue change was accepted.");
      return { state: item.state, idempotent: false, conflict: true };
    }
    addAudit(item, "RAZORPAY", "Duplicate callback ignored", "Terminal outcome already recorded; state and metrics are unchanged.");
    return { state: item.state, idempotent: true, conflict: false };
  }
  if (!canApplyVerifiedOutcome(item.state, outcome)) throw new Error("Outcome is invalid for the current recovery state.");
  if (outcome === "RECOVERED") {
    item.state = "RECOVERED";
    item.reason = "Sandbox outcome verified once; recovered revenue is eligible for metric reporting.";
    item.risk = "Recovered";
  } else if (outcome === "EXPIRED") {
    item.state = "STOPPED";
    item.reason = "Sandbox Payment Link expired; no repeat action was dispatched.";
    item.risk = "Stopped safely";
  } else {
    item.state = "EXCEPTION";
    item.reason = "Conflicting callback held for merchant review; the case is not counted as recovered.";
    item.risk = "Exception";
  }
  addAudit(item, "RAZORPAY", `Verified sandbox outcome: ${outcome}`, item.reason);
  return { state: item.state, idempotent: false, conflict: outcome === "CONFLICT" };
}

export function applyRazorpayPaymentLinkOutcome(providerReference: string, event: "payment_link.paid" | "payment_link.expired" | "payment_link.partially_paid") {
  const caseId = providerReferenceIndex.get(providerReference);
  if (!caseId) throw new Error("Unknown Razorpay Test Mode Payment Link reference.");
  const outcome = event === "payment_link.paid" ? "RECOVERED" : event === "payment_link.expired" ? "EXPIRED" : "CONFLICT";
  return applySandboxOutcome(caseId, outcome);
}

export async function triggerSandboxFailure(scenario: "DUPLICATE_EVENT" | "INVALID_SIGNATURE" | "EXPIRED_LINK" | "CONFLICTING_OUTCOME" | "MISSING_CONSENT") {
  resetIfNeeded();
  if (scenario === "INVALID_SIGNATURE") {
    receipts.push({ sourceEventId: "evt_invalid_signature", eventType: "payment.failed", status: "REJECTED", detail: "Invalid signature rejected before recovery-case creation.", time: now() });
    return { scenario, result: "REJECTED_BEFORE_INGESTION", detail: "Invalid signature rejected before case creation." };
  }
  if (scenario === "DUPLICATE_EVENT") {
    await ingestSandboxEvent({ sourceEventId: "evt_duplicate_demo", externalPaymentId: "pay_duplicate_demo", amountPaise: 10_000, customerIdentity: "duplicate@merchant.test", failureType: "TEMPORARY_DECLINE", consentGranted: true });
    await ingestSandboxEvent({ sourceEventId: "evt_duplicate_demo", externalPaymentId: "pay_duplicate_demo", amountPaise: 10_000, customerIdentity: "duplicate@merchant.test", failureType: "TEMPORARY_DECLINE", consentGranted: true });
    return { scenario, result: "DUPLICATE_IGNORED", detail: "Existing source-event identity prevented a second case and action." };
  }
  if (scenario === "MISSING_CONSENT") {
    const result = await runManualRecovery("RCV-1040");
    return { scenario, result: result.plan.outcome, detail: "Consent policy stopped recovery before customer contact." };
  }
  if (scenario === "EXPIRED_LINK") {
    await runManualRecovery("RCV-1042");
    const result = applySandboxOutcome("RCV-1042", "EXPIRED");
    return { scenario, result: result.state, detail: "Expiry produced a terminal stop and no repeated action." };
  }
  const result = applySandboxOutcome("RCV-1039", "CONFLICT");
  return { scenario, result: result.state, detail: "A conflicting terminal outcome was isolated as an exception." };
}

async function executeAction(item: SandboxCase, actionType: RecoveryActionType, command: NonNullable<ReturnType<typeof planRecovery>["action"]>) {
  item.state = "ACTION_QUEUED";
  addAudit(item, "SYSTEM", "Action constrained", "Amount, customer identity, payment identity, policy snapshot, and idempotency key are locked.");
  if (actionType === "HUMAN_ESCALATION") {
    item.state = "APPROVAL_PENDING";
    item.reason = "Human escalation created; no external recovery action was run.";
    item.risk = "Merchant review";
    addAudit(item, "SYSTEM", "Human escalation created", item.reason);
    return;
  }
  if (actionType === "NO_ACTION") {
    item.state = "STOPPED";
    item.reason = "No action was selected by the governed policy.";
    item.risk = "Stopped safely";
    addAudit(item, "SYSTEM", "No action", item.reason);
    return;
  }
  item.state = "ACTION_ATTEMPTED";
  if (actionType === "PAYMENT_LINK_FALLBACK") {
    item.paymentLink = await adapter.create(command, 30);
    providerReferenceIndex.set(item.paymentLink.providerReference, item.id);
  }
  const actionLabel = actionType === "REMINDER" ? "Sandbox reminder dispatched" : actionType === "SIMULATED_RETRY" ? "Simulated retry dispatched" : "Sandbox Payment Link created";
  addAudit(item, "SYSTEM", actionLabel, "Action is in Test Mode simulation; no real customer contact or money movement occurs.");
  item.state = "AWAITING_OUTCOME";
  item.reason = "Bounded action dispatched; verified outcome is awaited.";
  item.risk = "Low";
}

function response(item: SandboxCase, outcome: "STOPPED" | "APPROVAL_REQUIRED" | "ACTION_READY", action: ReturnType<typeof planRecovery>["action"], stoppingReason: string | null) {
  return {
    entryLabel: "review/recover this payment",
    plan: { outcome, action, stoppingReason, policyRules: [] },
    paymentLink: item.paymentLink,
    sandboxNotice: "Razorpay Test Mode — Sandbox: no real money is moved.",
    case: displayCase(item),
  };
}

function requireCase(caseId: string) {
  const item = store.get(caseId);
  if (!item) throw new Error("Sandbox recovery case not found.");
  return item;
}
