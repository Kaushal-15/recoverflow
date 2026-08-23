import { describe, expect, it } from "vitest";
import { getBearerToken, hasSupabaseAuthConfiguration } from "./supabaseAuth";

describe("Supabase admin authentication boundary", () => {
  it("extracts only Bearer access tokens and requires browser-safe Supabase configuration", () => {
    expect(getBearerToken("Bearer example-token")).toBe("example-token");
    expect(getBearerToken("Basic example-token")).toBeNull();
    expect(getBearerToken(undefined)).toBeNull();
    expect(hasSupabaseAuthConfiguration()).toBe(true);
  });
});
