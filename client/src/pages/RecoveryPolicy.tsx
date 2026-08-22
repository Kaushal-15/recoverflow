import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Check, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export default function RecoveryPolicy() {
  const { data: policy } = trpc.recovery.policy.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.recovery.updatePolicy.useMutation();
  const [capRupees, setCapRupees] = useState(500);
  const [confidence, setConfidence] = useState(80);
  const [retries, setRetries] = useState(2);
  const [reminders, setReminders] = useState(2);
  const [requiresConsent, setRequiresConsent] = useState(true);

  useEffect(() => {
    if (!policy) return;
    setCapRupees(policy.autoActionAmountCapPaise / 100);
    setConfidence(policy.minimumConfidenceBps / 100);
    setRetries(policy.maxRetries);
    setReminders(policy.reminderMaxContacts);
    setRequiresConsent(policy.requiresConsent);
  }, [policy]);

  const save = () => update.mutate({
    autoActionAmountCapPaise: Math.max(1, Math.round(capRupees * 100)),
    minimumConfidenceBps: Math.max(0, Math.min(10000, Math.round(confidence * 100))),
    maxRetries: Math.max(0, Math.min(5, retries)),
    reminderMaxContacts: Math.max(0, Math.min(5, reminders)),
    requiresConsent,
  }, { onSuccess: () => { utils.recovery.policy.invalidate(); utils.recovery.overview.invalidate(); } });

  return <DashboardLayout allowDemo><div className="mx-auto max-w-[1300px] space-y-6 pb-10"><section className="flex flex-col gap-4 rounded-3xl border bg-gradient-to-br from-slate-950 to-slate-800 p-7 text-white sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Policy version {policy?.version ?? "…"}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Recovery policy</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">This is the deterministic boundary around the agent. Updates apply only to future recovery plans in this sandbox workspace.</p></div><Badge className="w-fit bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15"><Check className="mr-1 h-3.5 w-3.5" /> Active sandbox policy</Badge></section><div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><Card className="border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="text-lg">Autonomy controls</CardTitle><p className="text-sm text-slate-500">Tune these merchant-owned boundaries; the AI cannot rewrite them.</p></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><NumberControl label="Automatic action cap" prefix="₹" value={capRupees} onChange={setCapRupees} min={1} max={5000} helper="Higher amounts enter approval." /><NumberControl label="Minimum diagnosis confidence" suffix="%" value={confidence} onChange={setConfidence} min={0} max={100} helper="Below this, action pauses for review." /><NumberControl label="Maximum retry attempts" value={retries} onChange={setRetries} min={0} max={5} helper="Prevents repeated recovery pressure." /><NumberControl label="Reminder contact limit" value={reminders} onChange={setReminders} min={0} max={5} helper="Stops excessive follow-up." /><label className="col-span-full flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"><div><p className="font-medium text-slate-800">Require recovery consent</p><p className="mt-1 text-sm text-slate-500">Without consent, all customer-contact actions stop before dispatch.</p></div><input type="checkbox" checked={requiresConsent} onChange={event => setRequiresConsent(event.target.checked)} className="h-5 w-5 accent-slate-950" /></label><div className="col-span-full flex justify-end"><Button onClick={save} disabled={update.isPending} className="bg-slate-950 text-white hover:bg-slate-800"><Save className="mr-2 h-4 w-4" />{update.isPending ? "Saving policy…" : "Save policy as next version"}</Button></div>{update.data && <p className="col-span-full rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Policy version {update.data.version} is active for future sandbox recovery plans.</p>}</CardContent></Card><div className="space-y-5"><Card className="border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="text-lg">Eligibility</CardTitle></CardHeader><CardContent className="space-y-4"><ReadOnly label="Eligible failure types" value="Temporary decline · Customer friction" /><ReadOnly label="Resolved payments" value="Always stopped" /><ReadOnly label="High value or ambiguity" value="Merchant approval required" /></CardContent></Card><Card className="border-emerald-200 bg-emerald-50/60 shadow-sm"><CardContent className="flex gap-4 p-5"><div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div><div><p className="font-semibold text-emerald-950">Immutable action safeguards</p><p className="mt-1 text-sm leading-6 text-emerald-900">Amount, customer identity, payment identity, policy snapshot, and idempotency key are validated before an action can progress.</p></div></CardContent></Card></div></div><div className="flex items-center gap-2 text-sm text-slate-500"><LockKeyhole className="h-4 w-4" /> Existing recovery-case evidence remains intact even when future policy versions change.</div></div></DashboardLayout>;
}

function NumberControl({ label, value, onChange, min, max, helper, prefix, suffix }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; helper: string; prefix?: string; suffix?: string }) { return <label className="rounded-2xl border border-slate-200 p-4"><p className="font-medium text-slate-800">{label}</p><div className="mt-3 flex items-center gap-2"><span className="text-slate-400">{prefix}</span><input type="number" min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} className="w-full bg-transparent text-xl font-semibold outline-none" /><span className="text-slate-400">{suffix}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p></label>; }
function ReadOnly({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1.5 text-sm font-medium leading-5 text-slate-700">{value}</p></div>; }
