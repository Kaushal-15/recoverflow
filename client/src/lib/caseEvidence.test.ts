import { describe, expect, it } from "vitest";
import { buildEvidenceCsv, getDecisionClass, getSyntheticEvidence } from "./caseEvidence";

describe("synthetic selected-case evidence", () => {
  it("returns explicitly Test Mode payment and classified review evidence for a known case", () => {
    const evidence = getSyntheticEvidence("RCV-1042", "AWAITING_OUTCOME");
    expect(evidence.paymentMode).toContain("Test Mode");
    expect(evidence.maskedIp).toContain("masked");
    expect(evidence.reviews.map(review => review.status)).toEqual(["APPROVED", "APPROVED", "PENDING"]);
  });

  it("classifies fallback exception cases as exempted from automated recovery", () => {
    const evidence = getSyntheticEvidence("RCV-unknown", "EXCEPTION");
    expect(evidence.reviews[0]?.status).toBe("EXEMPTED");
    expect(evidence.issueDetail).toContain("no real customer");
  });

  it("maps every declared decision class to a filterable synthetic case", () => {
    expect(getDecisionClass("RECOVERED")).toBe("APPROVED");
    expect(getDecisionClass("STOPPED", "RCV-1044")).toBe("REJECTED");
    expect(getDecisionClass("EXCEPTION", "RCV-1045")).toBe("EXEMPTED");
    expect(getDecisionClass("EXCEPTION", "RCV-1038")).toBe("ESCALATED");
    expect(getDecisionClass("APPROVAL_PENDING")).toBe("PENDING");
    expect(getDecisionClass("STOPPED", "RCV-1040")).toBe("STOPPED");
  });

  it("creates a CSV that is explicitly synthetic and protects formula-like fields", () => {
    const evidence = getSyntheticEvidence("RCV-1042", "AWAITING_OUTCOME");
    const csv = buildEvidenceCsv({ caseId: "RCV-1042", customer: "=customer@merchant.test", amountPaise: 48600, state: "AWAITING_OUTCOME", confidence: 92, risk: "LOW", updatedAt: "10:42", evidence });
    expect(csv).toContain("Synthetic Test Mode evidence only");
    expect(csv).toContain("'=customer@merchant.test");
    expect(csv).toContain("approved_review");
  });
});
