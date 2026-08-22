export const FAILURE_TYPES = ["TEMPORARY_DECLINE", "CUSTOMER_FRICTION", "INSUFFICIENT_CONTEXT", "UNSUPPORTED"] as const;
export type FailureType = (typeof FAILURE_TYPES)[number];

export const RECOVERY_ACTION_TYPES = ["NO_ACTION", "SIMULATED_RETRY", "PAYMENT_LINK_FALLBACK", "REMINDER", "HUMAN_ESCALATION"] as const;
export type RecoveryActionType = (typeof RECOVERY_ACTION_TYPES)[number];

export const RECOVERY_CASE_STATES = ["RECEIVED", "INGESTED", "POLICY_EVALUATING", "DIAGNOSING", "ACTION_DECIDED", "APPROVAL_PENDING", "ACTION_QUEUED", "ACTION_ATTEMPTED", "AWAITING_OUTCOME", "RECOVERED", "STOPPED", "EXCEPTION", "REJECTED", "DUPLICATE_IGNORED"] as const;
export type RecoveryCaseState = (typeof RECOVERY_CASE_STATES)[number];

export type RecoveryPolicyInput = {
  eligibleFailureTypes: FailureType[];
  permittedActionTypes: RecoveryActionType[];
  autoActionAmountCapPaise: number;
  maxRetries: number;
  requiresConsent: boolean;
  minimumConfidenceBps: number;
  reminderMaxContacts: number;
};

export type RecoveryCandidate = {
  amountPaise: number;
  customerIdentity: string;
  externalPaymentId: string;
  failureType: FailureType;
  consentGranted: boolean;
  retryCount: number;
  reminderCount: number;
  confidenceBps: number;
  isAmbiguous: boolean;
  hasRiskFlag: boolean;
  alreadyResolved: boolean;
};

export type PolicyEvaluation = {
  eligible: boolean;
  requiresApproval: boolean;
  stoppingReason: string | null;
  matchedRules: string[];
  permittedActionTypes: RecoveryActionType[];
};

export type ValidatedActionCommand = {
  actionType: RecoveryActionType;
  amountPaise: number;
  customerIdentity: string;
  externalPaymentId: string;
  idempotencyKey: string;
};
