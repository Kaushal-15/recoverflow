import { describe, expect, it } from "vitest";
import { clampUnit, getSceneOffset, getScrollProgress } from "./landingMotion";

describe("landing motion helpers", () => {
  it("clamps progress to the unit interval", () => {
    expect(clampUnit(-0.4)).toBe(0);
    expect(clampUnit(0.45)).toBe(0.45);
    expect(clampUnit(1.8)).toBe(1);
  });

  it("calculates document scroll progress without dividing by zero", () => {
    expect(getScrollProgress(0, 1000, 500)).toBe(0);
    expect(getScrollProgress(250, 1000, 500)).toBe(0.5);
    expect(getScrollProgress(900, 1000, 500)).toBe(1);
    expect(getScrollProgress(0, 500, 500)).toBe(0);
  });

  it("maps progress to a bounded scene offset", () => {
    expect(getSceneOffset(0, 42)).toBe(0);
    expect(getSceneOffset(0.5, 42)).toBe(21);
    expect(getSceneOffset(1.2, -34)).toBe(-34);
  });
});
