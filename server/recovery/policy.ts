import {
  type PolicyEvaluation,
  type RecoveryActionType,
  type RecoveryCandidate,
  type RecoveryPolicyInput,
  type ValidatedActionCommand,
} from "../../shared/recovery";

export function evaluateRecoveryPolicy(policy: RecoveryPolicyInput, candidate: RecoveryCandidate): PolicyEvaluation {
  const matchedRules: string[] = [];

  if (candidate.amountPaise <= 0) {
    return stopped("INVALID_AMOUNT", matchedRules);
  }
  if (!candidate.customerIdentity.trim()) {
    return stopped("MISSING_CUSTOMER_IDENTITY", matchedRules);
  }
  if (candidate.alreadyResolved) {
    return stopped("PAYMENT_ALREADY_RESOLVED", matchedRules);
  }
  if (!policy.eligibleFailureTypes.includes(candidate.failureType)) {
    return stopped("FAILURE_TYPE_NOT_ELIGIBLE", matchedRules);
  }
  matchedRules.push("ELIGIBLE_FAILURE_TYPE");
  if (policy.requiresConsent && !candidate.consentGranted) {
    return stopped("CONSENT_REQUIRED", matchedRules);
  }
  if (policy.requiresConsent) matchedRules.push("CONSENT_VERIFIED");
  if (candidate.retryCount >= policy.maxRetries) {
    return stopped("RETRY_LIMIT_REACHED", matchedRules);
  }
  if (candidate.reminderCount >= policy.reminderMaxContacts) {
    return stopped("REMINDER_CONTACT_LIMIT_REACHED", matchedRules);
  }

  const requiresApproval =
    candidate.amountPaise > policy.autoActionAmountCapPaise ||
    candidate.confidenceBps < policy.minimumConfidenceBps ||
    candidate.isAmbiguous ||
    candidate.hasRiskFlag;

  if (candidate.amountPaise > policy.autoActionAmountCapPaise) matchedRules.push("AMOUNT_REQUIRES_APPROVAL");
  if (candidate.confidenceBps < policy.minimumConfidenceBps) matchedRules.push("LOW_CONFIDENCE_REQUIRES_APPROVAL");
  if (candidate.isAmbiguous) matchedRules.push("AMBIGUITY_REQUIRES_APPROVAL");
  if (candidate.hasRiskFlag) matchedRules.push("RISK_FLAG_REQUIRES_APPROVAL");
  if (!requiresApproval) matchedRules.push("AUTO_ACTION_ALLOWED");

  return {
    eligible: true,
    requiresApproval,
    stoppingReason: null,
    matchedRules,
    permittedActionTypes: policy.permittedActionTypes,
  };
}

export function validateActionCommand(
  policyEvaluation: PolicyEvaluation,
  candidate: RecoveryCandidate,
  command: ValidatedActionCommand,
): { valid: true } | { valid: false; reason: string } {
  if (!policyEvaluation.eligible) return { valid: false, reason: policyEvaluation.stoppingReason ?? "POLICY_BLOCKED" };
  if (!policyEvaluation.permittedActionTypes.includes(command.actionType)) return { valid: false, reason: "ACTION_NOT_PERMITTED" };
  if (command.amountPaise !== candidate.amountPaise) return { valid: false, reason: "AMOUNT_IMMUTABILITY_VIOLATION" };
  if (command.customerIdentity !== candidate.customerIdentity) return { valid: false, reason: "CUSTOMER_IDENTITY_IMMUTABILITY_VIOLATION" };
  if (command.externalPaymentId !== candidate.externalPaymentId) return { valid: false, reason: "PAYMENT_IDENTITY_IMMUTABILITY_VIOLATION" };
  if (!command.idempotencyKey.trim()) return { valid: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
  return { valid: true };
}

export function isAllowedAction(value: string): value is RecoveryActionType {
  return ["NO_ACTION", "SIMULATED_RETRY", "PAYMENT_LINK_FALLBACK", "REMINDER", "HUMAN_ESCALATION"].includes(value);
}

function stopped(reason: string, matchedRules: string[]): PolicyEvaluation {
  return {
    eligible: false,
    requiresApproval: false,
    stoppingReason: reason,
    matchedRules: [...matchedRules, reason],
    permittedActionTypes: [],
  };
}
