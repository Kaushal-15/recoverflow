import type { FailureType, RecoveryCandidate, RecoveryPolicyInput } from "../../shared/recovery";
import { planRecovery } from "./orchestrator";

export type SyntheticPaymentRecord = RecoveryCandidate & {
  recordId: string;
  split: "DEVELOPMENT" | "HELD_OUT";
  expectedRecovery: boolean;
  sourceEventId: string;
};

export type ComparatorName = "NO_ACTION" | "SINGLE_RETRY" | "PAYMENT_LINK" | "RECOVERFLOW";

export type ComparatorMetrics = {
  comparator: ComparatorName;
  recoveredRevenuePaise: number;
  eligibleRevenueAtRiskPaise: number;
  recoveryRate: number;
  actionPrecision: number;
  falsePositiveCostPaise: number;
  actionsAttempted: number;
  exceptions: number;
  stoppingRuleCompliance: number;
};

const failureTypes: FailureType[] = ["TEMPORARY_DECLINE", "CUSTOMER_FRICTION", "INSUFFICIENT_CONTEXT", "UNSUPPORTED"];

export const demoPolicy: RecoveryPolicyInput = {
  eligibleFailureTypes: ["TEMPORARY_DECLINE", "CUSTOMER_FRICTION"],
  permittedActionTypes: ["SIMULATED_RETRY", "PAYMENT_LINK_FALLBACK", "REMINDER", "HUMAN_ESCALATION"],
  autoActionAmountCapPaise: 50_000,
  maxRetries: 2,
  requiresConsent: true,
  minimumConfidenceBps: 8_000,
  reminderMaxContacts: 2,
};

export function buildSyntheticBatch(seed = 20260822, count = 200): SyntheticPaymentRecord[] {
  const next = createPrng(seed);
  return Array.from({ length: count }, (_, index) => {
    const failureType = failureTypes[Math.floor(next() * failureTypes.length)] ?? "INSUFFICIENT_CONTEXT";
    const amountPaise = 10_000 + Math.floor(next() * 170_000);
    const consentGranted = next() > 0.18;
    const isAmbiguous = failureType === "INSUFFICIENT_CONTEXT" || next() < 0.08;
    const hasRiskFlag = next() < 0.05;
    const retryCount = next() < 0.12 ? 2 : next() < 0.28 ? 1 : 0;
    const expectedRecovery = consentGranted && !hasRiskFlag && !isAmbiguous && (failureType === "TEMPORARY_DECLINE" ? next() < 0.71 : failureType === "CUSTOMER_FRICTION" ? next() < 0.58 : next() < 0.12);
    return {
      recordId: `SYN-${String(index + 1).padStart(3, "0")}`,
      sourceEventId: `evt_synthetic_${seed}_${index + 1}`,
      split: index % 5 === 0 ? "HELD_OUT" : "DEVELOPMENT",
      amountPaise,
      customerIdentity: `customer_${String(index + 1).padStart(3, "0")}@merchant.test`,
      externalPaymentId: `pay_synthetic_${seed}_${index + 1}`,
      failureType,
      consentGranted,
      retryCount,
      reminderCount: next() < 0.08 ? 2 : 0,
      confidenceBps: isAmbiguous ? 5_600 : hasRiskFlag ? 7_100 : failureType === "TEMPORARY_DECLINE" ? 9_100 : 8_400,
      isAmbiguous,
      hasRiskFlag,
      alreadyResolved: false,
      expectedRecovery,
    };
  });
}

export function evaluateComparator(records: SyntheticPaymentRecord[], comparator: ComparatorName, policy = demoPolicy): ComparatorMetrics {
  let recoveredRevenuePaise = 0;
  let eligibleRevenueAtRiskPaise = 0;
  let actionsAttempted = 0;
  let successfulActions = 0;
  let falsePositiveCostPaise = 0;
  let exceptions = 0;
  let correctlyStopped = 0;
  let requiredStops = 0;

  for (const record of records) {
    const plan = planRecovery({ policy, candidate: record, caseReference: record.recordId });
    const policyEligible = plan.outcome !== "STOPPED" || plan.stoppingReason === "NO_POLICY_APPROVED_ACTION";
    if (policyEligible && record.consentGranted && policy.eligibleFailureTypes.includes(record.failureType)) eligibleRevenueAtRiskPaise += record.amountPaise;
    const requiresStop = record.isAmbiguous || record.hasRiskFlag || !record.consentGranted || record.retryCount >= policy.maxRetries;
    if (requiresStop) requiredStops += 1;

    const action = actionForComparator(comparator, record, plan.outcome);
    if (!action) {
      if (requiresStop && (plan.outcome === "STOPPED" || comparator === "NO_ACTION")) correctlyStopped += 1;
      continue;
    }
    actionsAttempted += 1;
    const succeeds = record.expectedRecovery;
    if (succeeds) {
      recoveredRevenuePaise += record.amountPaise;
      successfulActions += 1;
    } else {
      falsePositiveCostPaise += 750;
    }
    if (record.isAmbiguous || record.hasRiskFlag) exceptions += 1;
  }

  return {
    comparator,
    recoveredRevenuePaise,
    eligibleRevenueAtRiskPaise,
    recoveryRate: percent(recoveredRevenuePaise, eligibleRevenueAtRiskPaise),
    actionPrecision: percent(successfulActions, actionsAttempted),
    falsePositiveCostPaise,
    actionsAttempted,
    exceptions,
    stoppingRuleCompliance: requiredStops === 0 ? 100 : percent(correctlyStopped, requiredStops),
  };
}

export function buildEvaluationReport(seed = 20260822) {
  const records = buildSyntheticBatch(seed, 200);
  const all = ["NO_ACTION", "SINGLE_RETRY", "PAYMENT_LINK", "RECOVERFLOW"] as const;
  const comparators = all.map(comparator => evaluateComparator(records, comparator));
  const recoverflow = comparators.find(item => item.comparator === "RECOVERFLOW")!;
  const retryBaseline = comparators.find(item => item.comparator === "SINGLE_RETRY")!;
  return {
    seed,
    recordCount: records.length,
    heldOutCount: records.filter(record => record.split === "HELD_OUT").length,
    comparators,
    recoverflow,
    baselineLift: retryBaseline.recoveredRevenuePaise === 0 ? 0 : Number((((recoverflow.recoveredRevenuePaise - retryBaseline.recoveredRevenuePaise) / retryBaseline.recoveredRevenuePaise) * 100).toFixed(1)),
    exceptionRate: Number(((recoverflow.exceptions / records.length) * 100).toFixed(1)),
  };
}

function actionForComparator(comparator: ComparatorName, record: SyntheticPaymentRecord, planOutcome: "STOPPED" | "APPROVAL_REQUIRED" | "ACTION_READY") {
  if (comparator === "NO_ACTION") return null;
  if (!record.consentGranted || !demoPolicy.eligibleFailureTypes.includes(record.failureType)) return null;
  if (comparator === "SINGLE_RETRY") return "SIMULATED_RETRY";
  if (comparator === "PAYMENT_LINK") return "PAYMENT_LINK_FALLBACK";
  if (planOutcome === "ACTION_READY" || planOutcome === "APPROVAL_REQUIRED") return record.failureType === "TEMPORARY_DECLINE" ? "SIMULATED_RETRY" : "PAYMENT_LINK_FALLBACK";
  return null;
}

function percent(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : Number(((numerator / denominator) * 100).toFixed(1));
}

function createPrng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
