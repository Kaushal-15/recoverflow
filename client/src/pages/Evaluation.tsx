import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { BarChart3, Database, FlaskConical, ShieldCheck } from "lucide-react";

export default function Evaluation() {
  const { data } = trpc.recovery.overview.useQuery();
  const metrics = data?.metrics;
  const utils = trpc.useUtils();
  const scenario = trpc.recovery.runFailureScenario.useMutation();
  const batch = trpc.recovery.ingestSandboxBatch.useMutation();

  return (
    <DashboardLayout allowDemo>
      <div className="mx-auto max-w-[1300px] space-y-6 pb-10">
        <section className="rf-command-surface relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-950 to-cyan-950 p-7 text-white shadow-2xl">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Reproducible evidence</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Recovery evaluation</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">A policy-gated evidence trail across a deterministic 200-record replay, with 40 records held out from tuning and fixed baseline comparators.</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <EvalCard icon={Database} label="Dataset design" value={`${metrics?.recordCount ?? 200} records`} sub={`${metrics?.recordCount ? metrics.recordCount - (metrics.heldOutCount ?? 40) : 160} development · ${metrics?.heldOutCount ?? 40} held-out`} />
          <EvalCard icon={FlaskConical} label="Comparators" value="3 baselines" sub="No-action · retry-all · link-all" />
          <EvalCard icon={ShieldCheck} label="Safety suite" value="5 live scenarios" sub="Duplicates, bad signatures, expiry, conflict, consent" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <Card className="border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="font-display">Policy agent versus deterministic baseline</CardTitle></CardHeader><CardContent className="space-y-6"><MetricBar label="Recovery rate" value={metrics?.recoveryRate ?? 0} annotation="RecoverFlow policy agent" /><MetricBar label="Action precision" value={metrics?.actionPrecision ?? 0} annotation="Verified Test Mode outcomes only" /><MetricBar label="Stopping-rule compliance" value={metrics?.stoppingRuleCompliance ?? 0} annotation="Blocked cases stop before any action" /><MetricBar label="Exception visibility" value={metrics?.exceptionRate ?? 0} annotation="Shown, never hidden" /></CardContent></Card>
          <Card className="border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="font-display">Metric integrity</CardTitle></CardHeader><CardContent className="space-y-4"><Integrity title="Recovered revenue" detail="Counts only a verified sandbox outcome, never an attempted action." /><Integrity title="False-positive cost" detail="Captures avoidable contact or action burden." /><Integrity title="No cherry-picking" detail="Every batch record and exception appears in the run." /><p className="rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-300">Razorpay Test Mode — Payment Link authentication is validated. These evaluation values remain controlled demo simulations until signed webhook events are configured.</p></CardContent></Card>
        </section>

        <Card className="border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="font-display">Explicit baseline comparison</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="border-b text-left text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-2 py-3 font-semibold">Comparator</th><th className="px-2 py-3 font-semibold">Recovered revenue</th><th className="px-2 py-3 font-semibold">Recovery rate</th><th className="px-2 py-3 font-semibold">Precision</th><th className="px-2 py-3 font-semibold">False-positive cost</th><th className="px-2 py-3 font-semibold">Actions</th></tr></thead><tbody>{data?.comparators.map(item => <tr key={item.comparator} className={`border-b last:border-0 ${item.comparator === "RECOVERFLOW" ? "bg-emerald-50/70 font-medium" : ""}`}><td className="px-2 py-3">{item.comparator === "RECOVERFLOW" ? "RecoverFlow policy agent" : item.comparator.replaceAll("_", " ")}</td><td className="px-2 py-3">₹{(item.recoveredRevenuePaise / 100).toLocaleString("en-IN")}</td><td className="px-2 py-3">{item.recoveryRate}%</td><td className="px-2 py-3">{item.actionPrecision}%</td><td className="px-2 py-3">₹{(item.falsePositiveCostPaise / 100).toLocaleString("en-IN")}</td><td className="px-2 py-3">{item.actionsAttempted}</td></tr>)}</tbody></table></CardContent></Card>

        <Card className="border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="font-display">Run the shared batch-ingestion path</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-slate-600">Feed 25 deterministic records through the same governed ingestion pipeline used by webhook-like events and manual review.</p><Button onClick={() => batch.mutate({ limit: 25 }, { onSuccess: () => utils.recovery.overview.invalidate() })} disabled={batch.isPending} className="bg-slate-950 text-white hover:bg-slate-800">{batch.isPending ? "Processing sandbox batch…" : "Process 25-record sandbox batch"}</Button>{batch.data && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><p className="font-semibold">Batch processed</p><p className="mt-1">{batch.data.processed} new cases evaluated · {batch.data.duplicates} duplicates ignored.</p></div>}</CardContent></Card>
        <Card className="border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="font-display">Run a deliberate safety scenario</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2">{(["DUPLICATE_EVENT", "INVALID_SIGNATURE", "EXPIRED_LINK", "CONFLICTING_OUTCOME", "MISSING_CONSENT"] as const).map(item => <Button key={item} variant="outline" disabled={scenario.isPending} onClick={() => scenario.mutate({ scenario: item }, { onSuccess: () => utils.recovery.overview.invalidate() })}>{item.replaceAll("_", " ").toLowerCase()}</Button>)}</div>{scenario.data && <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-950"><p className="font-semibold">{scenario.data.result.replaceAll("_", " ")}</p><p className="mt-1 text-sky-800">{scenario.data.detail}</p></div>}</CardContent></Card>
      </div>
    </DashboardLayout>
  );
}

function EvalCard({ icon: Icon, label, value, sub }: { icon: typeof BarChart3; label: string; value: string; sub: string }) { return <Card className="border-slate-200/80 shadow-sm"><CardContent className="p-5"><div className="w-fit rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon className="h-5 w-5" /></div><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-display text-xl font-bold tracking-tight">{value}</p><p className="mt-1 text-sm text-slate-500">{sub}</p></CardContent></Card>; }
function MetricBar({ label, value, annotation }: { label: string; value: number; annotation: string }) { return <div><div className="mb-2 flex items-end justify-between"><div><p className="font-medium text-slate-800">{label}</p><p className="text-xs text-slate-500">{annotation}</p></div><p className="font-display text-lg font-bold">{value}%</p></div><Progress value={value} /></div>; }
function Integrity({ title, detail }: { title: string; detail: string }) { return <div><p className="font-medium text-slate-800">{title}</p><p className="mt-1 text-sm leading-5 text-slate-500">{detail}</p></div>; }
