import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowUpRight, CheckCircle2, CircleDollarSign, Clock3, FileCheck2, LockKeyhole, RefreshCcw, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

function formatCurrency(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

const stateStyle: Record<string, string> = {
  RECOVERED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  APPROVAL_PENDING: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  AWAITING_OUTCOME: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  STOPPED: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  EXCEPTION: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

export default function Home() {
  const overview = trpc.recovery.overview.useQuery();
  const utils = trpc.useUtils();
  const manualPreview = trpc.recovery.previewManualRecovery.useMutation();
  const approval = trpc.recovery.decideApproval.useMutation();
  const outcome = trpc.recovery.applyOutcome.useMutation();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const data = overview.data;
  const selectedCase = useMemo(() => data?.cases.find(item => item.id === selectedCaseId), [data?.cases, selectedCaseId]);

  return (
    <DashboardLayout allowDemo>
      <div className="mx-auto max-w-[1500px] space-y-6 pb-10">
        <section className="rf-command-surface relative overflow-hidden rounded-3xl border bg-slate-950 px-6 py-7 text-white shadow-2xl sm:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_0%,rgba(59,130,246,.35),transparent_36%),radial-gradient(circle_at_58%_100%,rgba(16,185,129,.18),transparent_34%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-sky-200"><ShieldCheck className="h-4 w-4" /> Controlled recovery workspace</div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Recover revenue without giving up control.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">Every recommended action is policy-gated, every exception remains merchant-controlled, and every decision is preserved in an immutable audit trail.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="flex items-center gap-2 text-xs font-medium text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Sandbox active</p>
              <p className="mt-1 text-xs text-slate-300">Razorpay Test Mode — no real money is moved.</p>
            </div>
          </div>
        </section>

        {data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={CircleDollarSign} label="Recovered revenue" value={formatCurrency(data.metrics.recoveredRevenuePaise)} trend={`+${data.metrics.baselineLift}% vs. baseline`} tone="emerald" />
              <MetricCard icon={TrendingUp} label="Recovery rate" value={`${data.metrics.recoveryRate}%`} trend="Held-out replay included" tone="sky" />
              <MetricCard icon={FileCheck2} label="Action precision" value={`${data.metrics.actionPrecision}%`} trend="Verified outcomes only" tone="violet" />
              <MetricCard icon={AlertCircle} label="Exceptions" value={`${data.metrics.exceptionRate}%`} trend={`${formatCurrency(data.metrics.falsePositiveCostPaise)} false-positive cost`} tone="rose" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.65fr_.85fr]">
              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Live recovery queue</p>
                    <CardTitle className="mt-1 text-xl">Actions with an explainable next step</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">{data.cases.length} active cases</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.cases.map(item => (
                    <button key={item.id} onClick={() => setSelectedCaseId(item.id)} className={`group grid w-full grid-cols-[1fr_auto] gap-4 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:grid-cols-[1.05fr_.75fr_.85fr_auto] ${selectedCaseId === item.id ? "border-sky-300 bg-sky-50/50 shadow-sm" : "border-slate-100 bg-white"}`}>
                      <div className="min-w-0"><p className="font-semibold text-slate-900">{item.id}</p><p className="mt-1 truncate text-sm text-slate-500">{item.customer}</p></div>
                      <div className="hidden sm:block"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">At risk</p><p className="mt-1 font-semibold text-slate-800">{formatCurrency(item.amountPaise)}</p></div>
                      <div className="hidden sm:block"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Diagnosis</p><p className="mt-1 text-sm font-medium text-slate-700">{item.failureType.replaceAll("_", " ")}</p></div>
                      <div className="flex items-center gap-3"><Badge variant="outline" className={stateStyle[item.state]}>{item.state.replaceAll("_", " ")}</Badge><ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Merchant controls</p><CardTitle className="mt-1 text-xl">Autonomy stays inside policy</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <PolicyRow label="Automatic action cap" value={data.policy.autoActionCap} icon={LockKeyhole} />
                  <PolicyRow label="Minimum confidence" value={data.policy.confidenceFloor} icon={Sparkles} />
                  <PolicyRow label="Maximum retry attempts" value={`${data.policy.retryLimit} attempts`} icon={RefreshCcw} />
                  <PolicyRow label="Customer consent" value={data.policy.consentRequired ? "Required" : "Optional"} icon={CheckCircle2} />
                  <Separator />
                  <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Closed action set</p><div className="mt-2 flex flex-wrap gap-2">{data.policy.approvedActions.map(action => <Badge key={action} variant="secondary" className="bg-slate-100 text-slate-700">{action}</Badge>)}</div></div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
              <Card className="rf-ledger-panel border-slate-200/80 shadow-sm">
                <CardHeader><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Immutable audit trail</p><CardTitle className="mt-1 text-xl">One recovery case, fully explainable</CardTitle></CardHeader>
                <CardContent className="space-y-5">{data.audit.map((entry, index) => <div className="relative flex gap-4" key={`${entry.time}-${entry.event}`}><div className="relative z-10 mt-1 h-8 w-8 shrink-0 rounded-full border border-sky-200 bg-sky-50 p-2 text-sky-700"><Clock3 className="h-4 w-4" /></div>{index < data.audit.length - 1 && <div className="absolute left-4 top-8 h-[calc(100%+4px)] border-l border-dashed border-slate-200" />}<div className="pb-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-medium text-slate-800">{entry.event}</p><span className="text-xs text-slate-400">{entry.time} · {entry.actor}</span></div><p className="mt-1 text-sm leading-5 text-slate-500">{entry.detail}</p></div></div>)}</CardContent>
              </Card>

              <Card className="rf-ledger-panel border-slate-200/80 shadow-sm">
                <CardHeader><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Event receipt ledger</p><CardTitle className="mt-1 text-xl">Verified, duplicate, and rejected events</CardTitle></CardHeader>
                <CardContent className="space-y-3">{data.receipts.length ? data.receipts.map((receipt, index) => <div key={`${receipt.sourceEventId}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-800">{receipt.eventType}</p><Badge variant="outline" className={receipt.status === "REJECTED" ? "border-rose-200 bg-rose-50 text-rose-700" : receipt.status === "DUPLICATE" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-sky-200 bg-sky-50 text-sky-700"}>{receipt.status}</Badge></div><p className="mt-1 text-xs leading-5 text-slate-500">{receipt.detail}</p></div>) : <p className="text-sm text-slate-500">No event receipts have been added in this sandbox session.</p>}</CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selected case</p><CardTitle className="mt-1 text-xl">{selectedCase ? selectedCase.id : "Choose a case to inspect"}</CardTitle></CardHeader>
                <CardContent>{selectedCase ? <div className="space-y-5"><div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">At-risk amount</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{formatCurrency(selectedCase.amountPaise)}</p></div><Badge variant="outline" className={stateStyle[selectedCase.state]}>{selectedCase.state.replaceAll("_", " ")}</Badge></div><p className="mt-3 text-sm leading-5 text-slate-600">{selectedCase.reason}</p></div><div className="grid grid-cols-2 gap-3 text-sm"><Detail label="Confidence" value={`${selectedCase.confidence}%`} /><Detail label="Risk route" value={selectedCase.risk} /><Detail label="Customer" value={selectedCase.customer} /><Detail label="Last update" value={selectedCase.updatedAt} /></div>{!['RECOVERED', 'STOPPED', 'EXCEPTION'].includes(selectedCase.state) && <Button className="w-full bg-slate-950 text-white hover:bg-slate-800" onClick={() => manualPreview.mutate({ caseId: selectedCase.id }, { onSuccess: () => utils.recovery.overview.invalidate() })} disabled={manualPreview.isPending}> {manualPreview.isPending ? "Preparing governed plan…" : "review/recover this payment"}</Button>}{selectedCase.state === 'APPROVAL_PENDING' && <div className="grid grid-cols-2 gap-3"><Button onClick={() => approval.mutate({ caseId: selectedCase.id, decision: 'APPROVE' }, { onSuccess: () => utils.recovery.overview.invalidate() })} disabled={approval.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">Approve action</Button><Button variant="outline" onClick={() => approval.mutate({ caseId: selectedCase.id, decision: 'REJECT' }, { onSuccess: () => utils.recovery.overview.invalidate() })} disabled={approval.isPending}>Reject and stop</Button></div>}{selectedCase.state === 'AWAITING_OUTCOME' && <div className="grid grid-cols-2 gap-3"><Button onClick={() => outcome.mutate({ caseId: selectedCase.id, outcome: 'RECOVERED' }, { onSuccess: () => utils.recovery.overview.invalidate() })} disabled={outcome.isPending} className="bg-sky-600 text-white hover:bg-sky-700">Simulate verified outcome</Button><Button variant="outline" onClick={() => outcome.mutate({ caseId: selectedCase.id, outcome: 'EXPIRED' }, { onSuccess: () => utils.recovery.overview.invalidate() })} disabled={outcome.isPending}>Simulate expiry</Button></div>}{selectedCase.paymentLink && <p className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-sky-900">Sandbox link: {selectedCase.paymentLink.providerReference} · expires {new Date(selectedCase.paymentLink.expiresAt).toLocaleTimeString()}</p>}{manualPreview.data && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-semibold">Governed recovery plan ready</p><p className="mt-1">{manualPreview.data.plan.outcome === "STOPPED" ? `No action: ${manualPreview.data.plan.stoppingReason}` : `${manualPreview.data.plan.outcome.replaceAll("_", " ")} · ${manualPreview.data.plan.action?.actionType?.replaceAll("_", " ")}`}</p><p className="mt-2 text-xs text-emerald-800">{manualPreview.data.sandboxNotice}</p></div>}</div> : <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">Select a case from the recovery queue to see its diagnosis, safety controls, and available merchant action.</div>}</CardContent>
              </Card>
            </section>
          </>
        ) : <div className="grid min-h-[420px] place-items-center rounded-3xl border border-dashed"><p className="text-sm text-slate-500">Loading recovery workspace…</p></div>}
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ icon: Icon, label, value, trend, tone }: { icon: typeof CircleDollarSign; label: string; value: string; trend: string; tone: "emerald" | "sky" | "violet" | "rose" }) {
  const classes = { emerald: "bg-emerald-50 text-emerald-700", sky: "bg-sky-50 text-sky-700", violet: "bg-violet-50 text-violet-700", rose: "bg-rose-50 text-rose-700" }[tone];
  return <Card className="border-slate-200/80 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p></div><div className={`rounded-xl p-2.5 ${classes}`}><Icon className="h-5 w-5" /></div></div><p className="mt-3 text-xs text-slate-500">{trend}</p></CardContent></Card>;
}

function PolicyRow({ label, value, icon: Icon }: { label: string; value: string; icon: typeof LockKeyhole }) { return <div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2 text-slate-600"><Icon className="h-4 w-4" /></div><div className="flex-1"><p className="text-sm text-slate-500">{label}</p><p className="mt-0.5 font-medium text-slate-800">{value}</p></div></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 truncate font-medium text-slate-700">{value}</p></div>; }
