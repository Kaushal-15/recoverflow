import { createHash } from "node:crypto";
import type { RecoveryActionType, RecoveryCandidate, RecoveryPolicyInput, ValidatedActionCommand } from "../../shared/recovery";
import { deterministicDiagnosis, type GroundedDiagnosis } from "./diagnosis";
import { evaluateRecoveryPolicy, validateActionCommand } from "./policy";

export type RecoveryPlan = {
  outcome: "STOPPED" | "APPROVAL_REQUIRED" | "ACTION_READY";
  diagnosis: GroundedDiagnosis | null;
  action: ValidatedActionCommand | null;
  stoppingReason: string | null;
  policyRules: string[];
};

export function planRecovery(input: {
  policy: RecoveryPolicyInput;
  candidate: RecoveryCandidate;
  diagnosis?: GroundedDiagnosis;
  caseReference: string;
}): RecoveryPlan {
  const policyResult = evaluateRecoveryPolicy(input.policy, input.candidate);
  if (!policyResult.eligible) {
    return { outcome: "STOPPED", diagnosis: null, action: null, stoppingReason: policyResult.stoppingReason, policyRules: policyResult.matchedRules };
  }

  const diagnosis = input.diagnosis ?? deterministicDiagnosis(input.candidate, policyResult.permittedActionTypes);
  const actionType = normalizeAction(diagnosis.recommendedAction, policyResult.permittedActionTypes);
  if (actionType === "NO_ACTION") {
    return { outcome: "STOPPED", diagnosis, action: null, stoppingReason: "NO_POLICY_APPROVED_ACTION", policyRules: policyResult.matchedRules };
  }

  const command: ValidatedActionCommand = {
    actionType,
    amountPaise: input.candidate.amountPaise,
    customerIdentity: input.candidate.customerIdentity,
    externalPaymentId: input.candidate.externalPaymentId,
    idempotencyKey: buildIdempotencyKey(input.caseReference, actionType, input.candidate.retryCount),
  };
  const commandCheck = validateActionCommand(policyResult, input.candidate, command);
  if (!commandCheck.valid) {
    return { outcome: "STOPPED", diagnosis, action: null, stoppingReason: commandCheck.reason, policyRules: policyResult.matchedRules };
  }
  if (policyResult.requiresApproval) {
    return { outcome: "APPROVAL_REQUIRED", diagnosis, action: command, stoppingReason: null, policyRules: policyResult.matchedRules };
  }
  return { outcome: "ACTION_READY", diagnosis, action: command, stoppingReason: null, policyRules: policyResult.matchedRules };
}

export function buildIdempotencyKey(caseReference: string, actionType: RecoveryActionType, attempt: number) {
  return createHash("sha256").update(`${caseReference}:${actionType}:${attempt}`).digest("hex");
}

function normalizeAction(recommendedAction: RecoveryActionType, permittedActions: RecoveryActionType[]): RecoveryActionType {
  return permittedActions.includes(recommendedAction) ? recommendedAction : "NO_ACTION";
}
