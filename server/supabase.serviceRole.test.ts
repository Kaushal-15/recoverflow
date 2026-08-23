import { describe, expect, it } from "vitest";

describe("Supabase service-role configuration", () => {
  it("accepts the configured server-only service role for a lightweight protected profile read", async () => {
    const projectUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(projectUrl).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co$/i);
    expect(serviceRoleKey).toMatch(/^eyJ/);

    const response = await fetch(`${projectUrl}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        apikey: serviceRoleKey!,
        Authorization: `Bearer ${serviceRoleKey!}`,
      },
    });

    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
