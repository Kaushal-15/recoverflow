import { describe, expect, it } from "vitest";
import handler from "../api/index";

describe("Vercel serverless entrypoint", () => {
  it("exports an Express-compatible request handler", () => {
    expect(typeof handler).toBe("function");
  });
});
