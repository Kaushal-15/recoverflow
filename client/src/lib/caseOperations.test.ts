import { describe, expect, it } from "vitest";
import { filterRecoveryCases, getBulkEligibleIds, isBulkReviewEligible, resolveSelectedCaseId } from "./caseOperations";

const cases = [
  { id: "RCV-1042", customer: "customer@merchant.test", amountPaise: 48600, state: "AWAITING_OUTCOME" },
  { id: "RCV-1041", customer: "buyer@merchant.test", amountPaise: 132500, state: "APPROVAL_PENDING" },
  { id: "RCV-1044", customer: "customer5@merchant.test", amountPaise: 64000, state: "STOPPED" },
];

describe("case operational controls", () => {
  it("combines ID/email search, decision class, date, and amount range filters", () => {
    const result = filterRecoveryCases(cases, { searchTerm: "buyer@", decisionFilter: "PENDING", activityDate: "2026-08-22", minAmountInr: "1000", maxAmountInr: "1500" });
    expect(result.map(item => item.id)).toEqual(["RCV-1041"]);
  });

  it("allows bulk decisions only for review-pending cases", () => {
    expect(isBulkReviewEligible("APPROVAL_PENDING")).toBe(true);
    expect(isBulkReviewEligible("AWAITING_OUTCOME")).toBe(false);
    expect(isBulkReviewEligible("STOPPED")).toBe(false);
  });

  it("keeps amount ranges unbounded when their fields are blank", () => {
    const result = filterRecoveryCases(cases, { searchTerm: "", decisionFilter: "PENDING", activityDate: "", minAmountInr: "", maxAmountInr: "" });
    expect(result.map(item => item.id)).toEqual(["RCV-1041"]);
  });

  it("revalidates bulk selection against only the visible pending-review cases", () => {
    expect(getBulkEligibleIds(cases, ["RCV-1041", "RCV-1042", "missing"])).toEqual(["RCV-1041"]);
  });

  it("preserves a visible selected case and resets to the first visible case after filters change", () => {
    expect(resolveSelectedCaseId("RCV-1041", cases)).toBe("RCV-1041");
    expect(resolveSelectedCaseId("RCV-1041", [cases[0]])).toBe("RCV-1042");
    expect(resolveSelectedCaseId("RCV-1041", [])).toBeNull();
  });
});
