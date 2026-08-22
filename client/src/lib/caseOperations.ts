import { getDecisionClass, type DecisionFilter } from "./caseEvidence";

export type FilterableCase = {
  id: string;
  customer: string;
  amountPaise: number;
  state: string;
};

export type CaseFilterInput = {
  searchTerm: string;
  decisionFilter: DecisionFilter;
  activityDate: string;
  minAmountInr: string;
  maxAmountInr: string;
};

const syntheticActivityDates: Record<string, string> = {
  "RCV-1042": "2026-08-22",
  "RCV-1041": "2026-08-22",
  "RCV-1043": "2026-08-21",
  "RCV-1040": "2026-08-20",
  "RCV-1039": "2026-08-19",
  "RCV-1038": "2026-08-18",
  "RCV-1044": "2026-08-17",
  "RCV-1045": "2026-08-16",
  "RCV-1046": "2026-08-22",
};

export function getSyntheticActivityDate(caseId: string) {
  return syntheticActivityDates[caseId] ?? "2026-08-22";
}

export function isBulkReviewEligible(state: string) {
  return state === "APPROVAL_PENDING";
}

export function getBulkEligibleIds<T extends FilterableCase>(cases: T[], selectedIds: string[]) {
  const selected = new Set(selectedIds);
  return cases.filter(item => selected.has(item.id) && isBulkReviewEligible(item.state)).map(item => item.id);
}

export function resolveSelectedCaseId<T extends { id: string }>(currentCaseId: string | null, visibleCases: T[]) {
  if (!visibleCases.length) return null;
  return currentCaseId && visibleCases.some(item => item.id === currentCaseId) ? currentCaseId : visibleCases[0].id;
}

function parseAmountInr(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

export function filterRecoveryCases<T extends FilterableCase>(cases: T[], filters: CaseFilterInput) {
  const query = filters.searchTerm.trim().toLowerCase();
  const minPaise = parseAmountInr(filters.minAmountInr);
  const maxPaise = parseAmountInr(filters.maxAmountInr);
  return cases.filter(item => {
    const textMatches = !query || item.id.toLowerCase().includes(query) || item.customer.toLowerCase().includes(query);
    const decisionMatches = filters.decisionFilter === "ALL" || getDecisionClass(item.state, item.id) === filters.decisionFilter;
    const dateMatches = !filters.activityDate || getSyntheticActivityDate(item.id) === filters.activityDate;
    const minMatches = minPaise === null || item.amountPaise >= minPaise;
    const maxMatches = maxPaise === null || item.amountPaise <= maxPaise;
    return textMatches && decisionMatches && dateMatches && minMatches && maxMatches;
  });
}
