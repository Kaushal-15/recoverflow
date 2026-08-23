import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Vercel serverless entrypoint", () => {
  it("uses Vercel's supported TypeScript function entrypoint and traces the explicit server bundle", () => {
    const entry = resolve(process.cwd(), "api/index.ts");
    expect(existsSync(entry)).toBe(true);
    expect(readFileSync(entry, "utf8")).toContain("../dist/vercel-app.cjs");
  });
});
