import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { buildEvidenceCsv, getDecisionClass, getSyntheticEvidence, reviewStyle, type DecisionFilter } from "@/lib/caseEvidence";
import { filterRecoveryCases, getBulkEligibleIds, getSyntheticActivityDate, isBulkReviewEligible, resolveSelectedCaseId } from "@/lib/caseOperations";
import { AlertCircle, ArrowUpRight, BadgeCheck, CheckCircle2, CircleDollarSign, Clock3, CreditCard, Download, FileCheck2, Laptop, LockKeyhole, MapPin, RefreshCcw, ScanEye, Search, ShieldAlert, ShieldCheck, Sparkles, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

const decisionFilters: { value: DecisionFilter; label: string }[] = [
  { value: "ALL", label: "All decision classes" },
  { value: "APPROVED", label: "Approved / action-ready" },
  { value: "REJECTED", label: "Rejected / stopped" },
  { value: "EXEMPTED", label: "Exempted / exception" },
  { value: "ESCALATED", label: "Escalated" },
  { value: "PENDING", label: "Pending review" },
  { value: "STOPPED", label: "Stopped safely" },
];

function actionErrorDescription(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("not awaiting merchant approval")) return "This case was already updated. Refresh the queue and choose its currently available action.";
  if (message.includes("invalid for the current recovery state")) return "This simulated outcome is no longer available because the recovery state changed.";
  if (message.includes("Sandbox recovery case not found")) return "This sandbox case is no longer available. Refresh the queue and try again.";
  return "The action was not completed. No outcome was recorded; refresh the queue and retry if the case is still eligible.";
}


export default function Home() {
  const overview = trpc.recovery.overview.useQuery();
  const utils = trpc.useUtils();
  const manualPreview = trpc.recovery.previewManualRecovery.useMutation({ onError: error => toast.error("Recovery plan was not prepared", { description: actionErrorDescription(error) }) });
  const approval = trpc.recovery.decideApproval.useMutation({ onError: error => toast.error("Merchant decision was not applied", { description: actionErrorDescription(error) }) });
  const outcome = trpc.recovery.applyOutcome.useMutation({ onError: error => toast.error("Sandbox outcome was not applied", { description: actionErrorDescription(error) }) });
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>(() => {
    const requested = new URLSearchParams(window.location.search).get("decision") as DecisionFilter | null;
    return requested && decisionFilters.some(filter => filter.value === requested) ? requested : "ALL";
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [minAmountInr, setMinAmountInr] = useState("");
  const [maxAmountInr, setMaxAmountInr] = useState("");
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);
  const data = overview.data;
  const selectedCase = useMemo(() => data?.cases.find(item => item.id === selectedCaseId), [data?.cases, selectedCaseId]);
  const filteredCases = useMemo(() => filterRecoveryCases(data?.cases ?? [], { searchTerm, decisionFilter, activityDate, minAmountInr, maxAmountInr }), [data?.cases, searchTerm, decisionFilter, activityDate, minAmountInr, maxAmountInr]);
  const pendingFilteredCases = useMemo(() => filteredCases.filter(item => isBulkReviewEligible(item.state)), [filteredCases]);

  useEffect(() => {
    const nextCaseId = resolveSelectedCaseId(selectedCaseId, filteredCases);
    if (nextCaseId !== selectedCaseId) setSelectedCaseId(nextCaseId);
  }, [filteredCases, selectedCaseId]);

  useEffect(() => {
    setBulkSelection(current => current.filter(caseId => pendingFilteredCases.some(item => item.id === caseId)));
  }, [pendingFilteredCases]);

  const toggleBulkCase = (caseId: string) => setBulkSelection(current => current.includes(caseId) ? current.filter(id => id !== caseId) : [...current, caseId]);
  const applyBulkDecision = async (decision: "APPROVE" | "REJECT") => {
    const eligibleIds = getBulkEligibleIds(pendingFilteredCases, bulkSelection);
    if (!eligibleIds.length) return;
    const results = await Promise.allSettled(eligibleIds.map(caseId => approval.mutateAsync({ caseId, decision })));
    const completed = results.filter(result => result.status === "fulfilled").length;
    const failed = results.length - completed;
    setBulkSelection([]);
    await utils.recovery.overview.invalidate();
    if (completed) toast.success(`${decision === "APPROVE" ? "Approved" : "Rejected"} ${completed} pending case${completed === 1 ? "" : "s"}.`);
    if (failed) toast.error(`${failed} case action${failed === 1 ? "" : "s"} could not be applied.`, { description: "The completed decisions were preserved. Review the refreshed queue before retrying the remaining cases." });
  };

  const clearFilters = () => { setSearchTerm(""); setDecisionFilter("ALL"); setActivityDate(""); setMinAmountInr(""); setMaxAmountInr(""); };
  const filtersActive = Boolean(searchTerm || decisionFilter !== "ALL" || activityDate || minAmountInr || maxAmountInr);

  return (
    <DashboardLayout>
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
                  <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">{filteredCases.length}/{data.cases.length} cases</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_.9fr_.75fr_.75fr_auto] dark:border-white/10 dark:bg-white/[0.03]">
                    <label className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><span className="sr-only">Search by case ID or customer email</span><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Case ID or customer email" className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100" /></label>
                    <label><span className="sr-only">Filter recovery cases by decision class</span><select value={decisionFilter} onChange={event => setDecisionFilter(event.target.value as DecisionFilter)} className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"><option value="ALL">All classes</option>{decisionFilters.slice(1).map(filter => <option key={filter.value} value={filter.value}>{filter.label}</option>)}</select></label>
                    <label><span className="sr-only">Filter by synthetic activity date</span><input value={activityDate} onChange={event => setActivityDate(event.target.value)} type="text" onFocus={event => event.target.type = "date"} onBlur={event => { if (!event.target.value) event.target.type = "text"; }} max="2026-08-22" placeholder="Activity date" title="Filter by date" className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100" /></label>
                    <label><span className="sr-only">Minimum amount in INR</span><input value={minAmountInr} onChange={event => setMinAmountInr(event.target.value)} inputMode="numeric" placeholder="Min ₹" className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100" /></label>
                    <label><span className="sr-only">Maximum amount in INR</span><input value={maxAmountInr} onChange={event => setMaxAmountInr(event.target.value)} inputMode="numeric" placeholder="Max ₹" className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100" /></label>
                    <Button variant="outline" size="sm" onClick={clearFilters} disabled={!filtersActive} className="gap-1.5"><X className="h-3.5 w-3.5" />Clear</Button>
                  </div>
                  {pendingFilteredCases.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-300/20 dark:bg-amber-300/10"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-200">Bulk review guardrail</p><p className="mt-1 text-xs text-amber-900 dark:text-amber-50">Only {pendingFilteredCases.length} pending-review case{pendingFilteredCases.length === 1 ? "" : "s"} can be selected. {bulkSelection.length} selected.</p></div><div className="flex gap-2"><Button size="sm" onClick={() => applyBulkDecision("APPROVE")} disabled={!bulkSelection.length || approval.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">Approve selected</Button><Button size="sm" variant="outline" onClick={() => applyBulkDecision("REJECT")} disabled={!bulkSelection.length || approval.isPending}>Reject selected</Button></div></div>}
                  {filteredCases.length ? filteredCases.map(item => <div key={item.id} className={`group flex gap-2 rounded-2xl border p-2 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${selectedCaseId === item.id ? "border-sky-300 bg-sky-50/50 shadow-sm" : "border-slate-100 bg-white dark:border-white/10 dark:bg-slate-950"}`}>
                    <label className="flex w-7 shrink-0 items-center justify-center" title={isBulkReviewEligible(item.state) ? "Select pending review case for bulk decision" : "Only pending review cases can be bulk reviewed"}><input type="checkbox" checked={bulkSelection.includes(item.id)} onChange={() => toggleBulkCase(item.id)} disabled={!isBulkReviewEligible(item.state)} className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-30" /></label>
                    <button onClick={() => setSelectedCaseId(item.id)} className="grid min-w-0 flex-1 grid-cols-[1fr_auto] gap-4 rounded-xl p-2 text-left sm:grid-cols-[1.05fr_.75fr_.85fr_auto]">
                      <div className="min-w-0"><p className="font-semibold text-slate-900 dark:text-slate-100">{item.id}</p><p className="mt-1 truncate text-sm text-slate-500">{item.customer}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{getSyntheticActivityDate(item.id)} · {getDecisionClass(item.state, item.id)}</p></div>
                      <div className="hidden sm:block"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">At risk</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.amountPaise)}</p></div>
                      <div className="hidden sm:block"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Diagnosis</p><p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{item.failureType.replaceAll("_", " ")}</p></div>
                      <div className="flex items-center gap-3"><Badge variant="outline" className={stateStyle[item.state]}>{item.state.replaceAll("_", " ")}</Badge><ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
                    </button>
                  </div>) : <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No recovery cases match the current search and filter combination. Clear a filter to inspect the full queue.</div>}
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
                <CardContent className="space-y-5">{data.audit.map((entry, index) => <div className="relative flex gap-4" key={`${entry.time}-${entry.event}`}><div className="relative z-10 mt-1 h-8 w-8 shrink-0 rounded-full border border-sky-200 bg-sky-50 p-2 text-sky-700"><Clock3 className="h-4 w-4" /></div>{index < data.audit.length - 1 && <div className="absolute left-4 top-8 h-[calc(100%+4px)] border-l border-dashed border-slate-200" />}<div className="pb-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-medium text-slate-800">{entry.event === "review/recover this payment" ? "Review this payment" : entry.event}</p><span className="text-xs text-slate-400">{entry.time} · {entry.actor}</span></div><p className="mt-1 text-sm leading-5 text-slate-500">{entry.detail}</p></div></div>)}</CardContent>
              </Card>

              <Card className="rf-ledger-panel border-slate-200/80 shadow-sm">
                <CardHeader><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Event receipt ledger</p><CardTitle className="mt-1 text-xl">Verified, duplicate, and rejected events</CardTitle></CardHeader>
                <CardContent className="space-y-3">{data.receipts.length ? data.receipts.map((receipt, index) => <div key={`${receipt.sourceEventId}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-800">{receipt.eventType}</p><Badge variant="outline" className={receipt.status === "REJECTED" ? "border-rose-200 bg-rose-50 text-rose-700" : receipt.status === "DUPLICATE" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-sky-200 bg-sky-50 text-sky-700"}>{receipt.status}</Badge></div><p className="mt-1 text-xs leading-5 text-slate-500">{receipt.detail}</p></div>) : <p className="text-sm text-slate-500">No event receipts have been added in this sandbox session.</p>}</CardContent>
              </Card>

              <CaseInvestigation selectedCase={selectedCase} manualPreview={manualPreview} approval={approval} outcome={outcome} onRefresh={() => utils.recovery.overview.invalidate()} />
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

function CaseInvestigation({ selectedCase, manualPreview, approval, outcome, onRefresh }: { selectedCase: any; manualPreview: any; approval: any; outcome: any; onRefresh: () => void }) {
  const [tab, setTab] = useState<"evidence" | "reviews">(() => new URLSearchParams(window.location.search).get("tab") === "reviews" ? "reviews" : "evidence");
  const evidence = selectedCase ? getSyntheticEvidence(selectedCase.id, selectedCase.state) : null;
  const downloadEvidenceCsv = () => {
    if (!selectedCase || !evidence) return;
    const csv = buildEvidenceCsv({ caseId: selectedCase.id, customer: selectedCase.customer, amountPaise: selectedCase.amountPaise, state: selectedCase.state, confidence: selectedCase.confidence, risk: selectedCase.risk, updatedAt: selectedCase.updatedAt, evidence });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `recoverflow-${selectedCase.id.toLowerCase()}-synthetic-evidence.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };
  return <Card className="rf-ledger-panel border-slate-200/80 shadow-sm"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selected case investigation</p><CardTitle className="mt-1 text-xl">{selectedCase ? selectedCase.id : "Choose a case to inspect"}</CardTitle></div>{selectedCase && <Badge variant="outline" className={stateStyle[selectedCase.state]}>{selectedCase.state.replaceAll("_", " ")}</Badge>}</div>{selectedCase && <div className="mt-4 flex gap-2"><div className="grid flex-1 grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-semibold dark:bg-slate-800"><button onClick={() => setTab("evidence")} className={`rounded-lg px-3 py-2 transition-colors ${tab === "evidence" ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500"}`}><span className="inline-flex items-center gap-1.5"><ScanEye className="h-3.5 w-3.5" />Case evidence</span></button><button onClick={() => setTab("reviews")} className={`rounded-lg px-3 py-2 transition-colors ${tab === "reviews" ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500"}`}><span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5" />Reviews done</span></button></div><Button variant="outline" size="icon" onClick={downloadEvidenceCsv} title="Export synthetic case evidence as CSV" aria-label="Export synthetic case evidence as CSV"><Download className="h-4 w-4" /></Button></div>}</CardHeader><CardContent>{!selectedCase ? <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">Select a case from the recovery queue to inspect synthetic Test Mode payment context, diagnosis, policy checks, and review outcomes.</div> : tab === "evidence" ? <div className="space-y-5"><p className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-900 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">Synthetic Test Mode evidence only. Payment, device, IP, and region values are demonstration data and do not identify a real customer.</p><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">At-risk amount</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{formatCurrency(selectedCase.amountPaise)}</p></div><Badge variant="outline" className={stateStyle[selectedCase.state]}>{selectedCase.state.replaceAll("_", " ")}</Badge></div><p className="mt-3 text-sm leading-5 text-slate-600 dark:text-slate-300">{selectedCase.reason}</p></div><div className="grid grid-cols-2 gap-3 text-sm"><Detail label="Confidence" value={`${selectedCase.confidence}%`} /><Detail label="Risk route" value={selectedCase.risk} /><Detail label="Customer" value={selectedCase.customer} /><Detail label="Last update" value={selectedCase.updatedAt} /></div><div className="grid gap-3 sm:grid-cols-2"><EvidenceCell icon={<CreditCard className="h-4 w-4" />} label="Payment mode" value={evidence!.paymentMode} detail={evidence!.rail} /><EvidenceCell icon={<MapPin className="h-4 w-4" />} label="IP / region" value={evidence!.maskedIp} detail={evidence!.region} /><EvidenceCell icon={<Laptop className="h-4 w-4" />} label="Device context" value={evidence!.device} detail="Synthetic browser fingerprint" /><EvidenceCell icon={<ShieldAlert className="h-4 w-4" />} label="Problem detected" value={evidence!.issue} detail="Grounded diagnosis" /></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-300/20 dark:bg-amber-300/10"><p className="text-xs font-bold uppercase tracking-[0.13em] text-amber-700 dark:text-amber-200">Why this case is here</p><p className="mt-2 text-sm leading-6 text-amber-950 dark:text-amber-50">{evidence!.issueDetail}</p><p className="mt-3 border-t border-amber-200/80 pt-3 text-xs leading-5 text-amber-800 dark:border-amber-300/20 dark:text-amber-100"><span className="font-semibold">Policy reading:</span> {evidence!.policyNote}</p></div>{!['RECOVERED', 'STOPPED', 'EXCEPTION'].includes(selectedCase.state) && <Button className="w-full bg-slate-950 text-white hover:bg-slate-800 dark:bg-cyan-300 dark:text-slate-950" onClick={() => manualPreview.mutate({ caseId: selectedCase.id }, { onSuccess: onRefresh })} disabled={manualPreview.isPending}>{manualPreview.isPending ? "Preparing governed plan…" : "Review this payment"}</Button>}{selectedCase.state === "APPROVAL_PENDING" && <div className="grid grid-cols-2 gap-3"><Button onClick={() => approval.mutate({ caseId: selectedCase.id, decision: "APPROVE" }, { onSuccess: onRefresh })} disabled={approval.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">Approve action</Button><Button variant="outline" onClick={() => approval.mutate({ caseId: selectedCase.id, decision: "REJECT" }, { onSuccess: onRefresh })} disabled={approval.isPending}>Reject and stop</Button></div>}{selectedCase.state === "AWAITING_OUTCOME" && <div className="grid grid-cols-2 gap-3"><Button onClick={() => outcome.mutate({ caseId: selectedCase.id, outcome: "RECOVERED" }, { onSuccess: onRefresh })} disabled={outcome.isPending} className="bg-sky-600 text-white hover:bg-sky-700">Simulate verified outcome</Button><Button variant="outline" onClick={() => outcome.mutate({ caseId: selectedCase.id, outcome: "EXPIRED" }, { onSuccess: onRefresh })} disabled={outcome.isPending}>Simulate expiry</Button></div>}{selectedCase.paymentLink && <p className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-100">Razorpay Test Mode link: {selectedCase.paymentLink.providerReference} · expires {new Date(selectedCase.paymentLink.expiresAt).toLocaleTimeString()}</p>}{manualPreview.data && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-50"><p className="font-semibold">Governed recovery plan ready</p><p className="mt-1">{manualPreview.data.plan.outcome === "STOPPED" ? `No action: ${manualPreview.data.plan.stoppingReason}` : `${manualPreview.data.plan.outcome.replaceAll("_", " ")} · ${manualPreview.data.plan.action?.actionType?.replaceAll("_", " ")}`}</p><p className="mt-2 text-xs opacity-80">{manualPreview.data.sandboxNotice}</p></div>}</div> : <div className="space-y-3"><p className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-900 dark:border-violet-300/20 dark:bg-violet-300/10 dark:text-violet-100">Review classifications are synthetic Test Mode evidence that explains how the case was governed. They are not real customer decisions.</p>{evidence!.reviews.map((review, index) => <div key={`${review.label}-${index}`} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900"><div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-200"><BadgeCheck className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{review.label}</p><Badge variant="outline" className={reviewStyle[review.status]}>{review.status}</Badge></div><p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{review.detail}</p><p className="mt-2 text-xs text-slate-400">{review.actor} · {review.time}</p></div></div>)}</div>}</CardContent></Card>;
}

function EvidenceCell({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-slate-200 p-3 dark:border-white/10"><div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div><p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p></div>; }
