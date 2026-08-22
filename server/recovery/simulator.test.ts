import { describe, expect, it } from "vitest";
import { buildEvaluationReport, buildSyntheticBatch, evaluateComparator } from "./simulator";

describe("synthetic evaluation simulator", () => {
  it("creates a deterministic 200-record batch with exactly 40 held-out records", () => {
    const first = buildSyntheticBatch(20260822, 200);
    const second = buildSyntheticBatch(20260822, 200);
    expect(first).toHaveLength(200);
    expect(first.filter(record => record.split === "HELD_OUT")).toHaveLength(40);
    expect(first).toEqual(second);
  });

  it("produces reproducible comparative metrics", () => {
    const report = buildEvaluationReport(20260822);
    expect(report.comparators).toHaveLength(4);
    expect(report.recoverflow.recoveredRevenuePaise).toBeGreaterThan(0);
    expect(report.recoverflow.actionPrecision).toBeGreaterThan(0);
    expect(report.recoverflow.stoppingRuleCompliance).toBeGreaterThan(0);
    expect(report.heldOutCount).toBe(40);
  });

  it("never assigns recovery to the no-action baseline", () => {
    const noAction = evaluateComparator(buildSyntheticBatch(), "NO_ACTION");
    expect(noAction.recoveredRevenuePaise).toBe(0);
    expect(noAction.actionsAttempted).toBe(0);
  });
});
