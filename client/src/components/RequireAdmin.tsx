import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { LoaderCircle, ShieldAlert } from "lucide-react";
import { type ComponentType, type LazyExoticComponent, useEffect } from "react";
import { useLocation } from "wouter";

type AdminComponent = ComponentType | LazyExoticComponent<ComponentType>;

export function RequireAdmin({ component: Component }: { component: AdminComponent }) {
  const { loading, isAdmin, isConfigured, error, signOut } = useAdminAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAdmin && !error) setLocation("/admin/login");
  }, [error, isAdmin, loading, setLocation]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center"><LoaderCircle className="h-7 w-7 animate-spin text-cyan-600" /></div>;
  }

  if (!isConfigured || error) {
    return <main className="grid min-h-screen place-items-center bg-slate-950 px-5 text-white"><section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl"><ShieldAlert className="mb-5 h-8 w-8 text-amber-300" /><p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Access control</p><h1 className="mt-2 text-2xl font-semibold">Admin access is not available</h1><p className="mt-3 leading-7 text-slate-300">{error ?? "Supabase authentication is not configured for this deployment."}</p><div className="mt-7 flex gap-3"><Button onClick={() => setLocation("/admin/login")} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">Admin sign in</Button><Button variant="outline" onClick={() => void signOut()} className="border-white/20 text-white hover:bg-white/10">Sign out</Button></div></section></main>;
  }

  if (!isAdmin) return <div className="grid min-h-screen place-items-center"><LoaderCircle className="h-7 w-7 animate-spin text-cyan-600" /></div>;
  return <Component />;
}
