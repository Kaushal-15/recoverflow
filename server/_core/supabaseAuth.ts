import { createClient } from "@supabase/supabase-js";
import type { Request } from "express";

export type SupabaseAdminUser = {
  id: string;
  openId: string;
  email: string | null;
  name: string | null;
  loginMethod: string;
  role: "user" | "admin" | "demo_viewer";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export function getBearerToken(header: string | undefined) {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export function hasSupabaseAuthConfiguration() {
  return Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
}

export async function authenticateSupabaseAdmin(req: Request): Promise<SupabaseAdminUser | null> {
  const token = getBearerToken(req.header("authorization"));
  if (!token || !hasSupabaseAuthConfiguration()) return null;

  const url = process.env.VITE_SUPABASE_URL!;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) return null;

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", authData.user.id)
    .maybeSingle<{ id: string; email: string; display_name: string | null; role: "user" | "admin" | "demo_viewer" }>();
  if (profileError || !profile) return null;

  const now = new Date();
  return {
    id: authData.user.id,
    openId: authData.user.id,
    email: profile.email,
    name: profile.display_name,
    loginMethod: "supabase",
    role: profile.role,
    createdAt: authData.user.created_at ? new Date(authData.user.created_at) : now,
    updatedAt: now,
    lastSignedIn: now,
  };
}
