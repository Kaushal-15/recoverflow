import type { RecoveryCaseState } from "../../shared/recovery";

const transitions: Partial<Record<RecoveryCaseState, RecoveryCaseState[]>> = {
  RECEIVED: ["INGESTED", "REJECTED", "DUPLICATE_IGNORED"],
  INGESTED: ["POLICY_EVALUATING"],
  POLICY_EVALUATING: ["DIAGNOSING", "STOPPED"],
  DIAGNOSING: ["ACTION_DECIDED", "EXCEPTION"],
  ACTION_DECIDED: ["APPROVAL_PENDING", "ACTION_QUEUED", "STOPPED"],
  APPROVAL_PENDING: ["ACTION_QUEUED", "STOPPED"],
  ACTION_QUEUED: ["ACTION_ATTEMPTED"],
  ACTION_ATTEMPTED: ["AWAITING_OUTCOME", "EXCEPTION"],
  AWAITING_OUTCOME: ["RECOVERED", "STOPPED", "EXCEPTION"],
  EXCEPTION: ["APPROVAL_PENDING", "STOPPED"],
};

export function canTransition(current: RecoveryCaseState, next: RecoveryCaseState) {
  return transitions[current]?.includes(next) ?? false;
}

export function assertTransition(current: RecoveryCaseState, next: RecoveryCaseState) {
  if (!canTransition(current, next)) throw new Error(`Invalid recovery state transition: ${current} -> ${next}`);
}

export function isTerminalState(state: RecoveryCaseState) {
  return ["RECOVERED", "STOPPED", "REJECTED", "DUPLICATE_IGNORED"].includes(state);
}

export function canApplyVerifiedOutcome(current: RecoveryCaseState, outcome: "RECOVERED" | "EXPIRED" | "CONFLICT") {
  if (current !== "AWAITING_OUTCOME") return false;
  return outcome === "RECOVERED" || outcome === "EXPIRED" || outcome === "CONFLICT";
}
