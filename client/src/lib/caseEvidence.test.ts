import { describe, expect, it } from "vitest";
import { getSyntheticEvidence } from "./caseEvidence";

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
});
