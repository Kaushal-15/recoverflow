import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const { signIn, loading, isConfigured, error } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const message = await signIn(email.trim(), password);
    setSubmitting(false);
    if (message) return setFormError(message);
    setLocation("/dashboard");
  }

  return <main className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,.18),transparent_30%),linear-gradient(135deg,#020617,#0f172a_55%,#020617)] px-5 py-10 text-white"><div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_.9fr]"><section><div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.16em] text-cyan-100"><ShieldCheck className="h-3.5 w-3.5" /> RecoverFlow control plane</div><h1 className="mt-6 max-w-xl font-display text-5xl font-semibold tracking-tight sm:text-6xl">Protected recovery operations.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Use the authorized Supabase administrator account to access governed payment-recovery decisions, evidence, policies, and Razorpay Test Mode outcomes.</p><p className="mt-8 text-sm text-slate-400">No public account creation is available. Your account must be provisioned with the RecoverFlow <strong className="font-semibold text-slate-200">admin</strong> role.</p></section><section className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-7 shadow-2xl backdrop-blur sm:p-9"><div className="mb-7 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-400 text-slate-950"><LockKeyhole className="h-5 w-5" /></div><div><p className="font-display text-xl font-semibold">Admin sign in</p><p className="text-sm text-slate-400">Supabase Auth · email and password</p></div></div>{!isConfigured ? <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">Supabase login configuration is incomplete for this deployment.</p> : <form className="space-y-5" onSubmit={submit}><div className="space-y-2"><Label htmlFor="admin-email" className="text-slate-200">Email</Label><Input id="admin-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="admin@company.com" required className="h-12 border-white/15 bg-white/5 text-white placeholder:text-slate-500" /></div><div className="space-y-2"><Label htmlFor="admin-password" className="text-slate-200">Password</Label><Input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required className="h-12 border-white/15 bg-white/5 text-white" /></div>{(formError || error) && <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100">{formError ?? error}</p>}<Button type="submit" disabled={submitting || loading} className="h-12 w-full bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300">{submitting ? "Signing in…" : "Sign in to the control plane"}</Button></form>}<button type="button" onClick={() => setLocation("/")} className="mt-6 text-sm text-slate-400 transition-colors hover:text-white">Return to RecoverFlow home</button></section></div></main>;
}
