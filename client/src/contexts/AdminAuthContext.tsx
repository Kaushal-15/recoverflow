import type { Session } from "@supabase/supabase-js";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, setSupabaseAccessToken, supabase } from "@/lib/supabase";

type AdminProfile = {
  id: string;
  email: string;
  display_name: string | null;
  role: "user" | "admin";
};

type AdminAuthContextValue = {
  profile: AdminProfile | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async (session: Session | null) => {
    setSupabaseAccessToken(session?.access_token ?? null);
    if (!session || !supabase) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, display_name, role")
      .eq("id", session.user.id)
      .maybeSingle<AdminProfile>();

    if (profileError || !data) {
      setProfile(null);
      setError("Your account is signed in but is not provisioned for RecoverFlow. Apply the Supabase migration and grant the account an admin role.");
    } else {
      setProfile(data);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => hydrate(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrate(session);
    });
    return () => subscription.subscription.unsubscribe();
  }, [hydrate]);

  const value = useMemo<AdminAuthContextValue>(() => ({
    profile,
    loading,
    error,
    isConfigured: isSupabaseConfigured,
    isAdmin: profile?.role === "admin",
    async signIn(email, password) {
      if (!supabase) return "Supabase authentication has not been configured.";
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) return signInError.message;
      await hydrate(data.session);
      return null;
    },
    async signOut() {
      setSupabaseAccessToken(null);
      setProfile(null);
      setError(null);
      if (supabase) await supabase.auth.signOut();
    },
  }), [error, hydrate, loading, profile]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return value;
}
