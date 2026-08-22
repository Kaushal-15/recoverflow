import { useTheme } from "@/contexts/ThemeContext";
import { Link } from "wouter";
import { Activity, ArrowRight, BadgeCheck, BrainCircuit, CheckCircle2, ChevronRight, CircleDollarSign, DatabaseZap, Moon, ShieldCheck, Sun, Workflow } from "lucide-react";

const features = [
  { icon: ShieldCheck, index: "01", title: "Policy-gated autonomy", copy: "Let low-risk recovery move while high-value, ambiguous, and consent-sensitive cases pause for your team." },
  { icon: BrainCircuit, index: "02", title: "Grounded diagnosis", copy: "Every recommendation is evidence-led, explained, and constrained to merchant-approved actions." },
  { icon: Workflow, index: "03", title: "Bounded orchestration", copy: "Retry, payment link, reminder, escalation, or no action—never an unbounded payment decision." },
  { icon: DatabaseZap, index: "04", title: "Immutable evidence", copy: "Policy checks, approvals, action attempts, receipts, and stopping reasons remain traceable." },
];

const controlSteps = [
  ["Signal", "A failed-payment event enters the recovery queue."],
  ["Gate", "Merchant policy verifies consent, amount, confidence, and limits."],
  ["Act", "Only an allowed recovery action may move forward."],
  ["Record", "Every action and outcome becomes an immutable audit receipt."],
];

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="rf-public min-h-screen overflow-x-hidden bg-background text-foreground">
      <nav className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="group flex items-center gap-3">
          <span className="rf-logo-mark grid h-10 w-10 place-items-center rounded-2xl text-white shadow-lg"><ShieldCheck className="h-5 w-5" /></span>
          <span><span className="font-display block text-base font-bold tracking-tight">RecoverFlow</span><span className="block text-[10px] font-bold uppercase tracking-[0.17em] text-muted-foreground">Control plane</span></span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground sm:block">Razorpay Test Mode</span>
          <button onClick={() => toggleTheme?.()} className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
          <Link href="/dashboard" className="hidden rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-slate-800 sm:block dark:bg-cyan-300 dark:text-slate-950">Explore dashboard</Link>
        </div>
      </nav>

      <main>
        <section className="relative mx-auto grid max-w-[1440px] gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-12 lg:pb-28">
          <div className="rf-public-glow pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-100/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800 dark:bg-cyan-300/10 dark:text-cyan-200"><BadgeCheck className="h-3.5 w-3.5" /> Recovery, under control</div>
            <h1 className="font-display text-4xl font-bold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">Revenue recovery that moves <span className="text-cyan-700 dark:text-cyan-300">with permission.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">RecoverFlow turns failed payments into a governed recovery flow. It combines explainable AI recommendations with merchant-owned policy gates and a ledger of every decision.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl dark:bg-cyan-300 dark:text-slate-950">Explore the dashboard <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
              <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/80 px-5 py-3.5 text-sm font-semibold transition-all hover:-translate-y-1 hover:shadow-lg">See how it works <ChevronRight className="h-4 w-4" /></a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-600" /> Policy-first automation</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-600" /> Immutable audit evidence</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-600" /> Test Mode ready</span></div>
          </div>

          <div className="relative mx-auto w-full max-w-[620px] [perspective:1400px]">
            <div className="rf-orbit rf-orbit-a" /><div className="rf-orbit rf-orbit-b" />
            <div className="rf-3d-stage relative z-10 rounded-[2rem] border border-white/20 bg-slate-950 p-5 text-white shadow-[0_35px_80px_-24px_rgba(8,33,51,.55)] sm:p-7">
              <div className="absolute inset-0 rounded-[2rem] bg-[linear-gradient(90deg,rgba(56,189,248,.12)_1px,transparent_1px),linear-gradient(rgba(56,189,248,.12)_1px,transparent_1px)] bg-[size:38px_38px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
              <div className="relative flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">Live policy path</p><p className="mt-1 font-display text-lg font-bold">RCV-1042 · ₹486</p></div><span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Action ready</span></div>
              <div className="rf-flow-stack mt-7 space-y-3">
                <FlowLayer index="01" title="Signal received" detail="Temporary decline · customer identified" icon={<Activity className="h-4 w-4" />} tone="cyan" />
                <FlowLayer index="02" title="Policy gate passed" detail="Consent, cap, confidence, retry rules verified" icon={<ShieldCheck className="h-4 w-4" />} tone="teal" />
                <FlowLayer index="03" title="Payment link fallback" detail="Bounded action · idempotent outcome waiting" icon={<CircleDollarSign className="h-4 w-4" />} tone="violet" />
              </div>
              <div className="relative mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-300"><span className="font-bold uppercase tracking-[0.13em] text-slate-400">Policy gate · verify · act · record</span><span className="text-emerald-200">Immutable receipt</span></div>
            </div>
            <div className="rf-floating-proof absolute -bottom-8 -left-5 z-20 rounded-2xl border border-white/60 bg-white/85 p-4 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/85"><p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Recovery evidence</p><p className="mt-1 font-display text-2xl font-bold text-slate-950 dark:text-white">56.2%</p><p className="text-xs text-muted-foreground">Recovery rate · held-out replay</p></div>
          </div>
        </section>

        <section className="border-y border-border/80 bg-card/50 py-7 backdrop-blur"><div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-6 px-5 sm:grid-cols-4 sm:px-8 lg:px-12"><Stat value="200" label="Deterministic cases" /><Stat value="40" label="Held-out records" /><Stat value="5" label="Bounded actions" /><Stat value="1" label="Immutable trail" /></div></section>

        <section id="how-it-works" className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">How RecoverFlow thinks</p><h2 className="mt-4 font-display text-4xl font-bold tracking-[-0.035em] sm:text-5xl">Automation is useful only when the guardrails are visible.</h2><p className="mt-5 max-w-md leading-7 text-muted-foreground">Every recovery follows a four-step control loop. A recommendation is not an action until it passes the merchant’s own policy boundary.</p><Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-cyan-700 transition-colors hover:text-cyan-500 dark:text-cyan-300">Open the control plane <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-4 sm:grid-cols-2">{controlSteps.map(([step, copy], index) => <div key={step} className="rf-step-card group rounded-3xl border border-border bg-card p-6 shadow-sm"><span className="font-display text-5xl font-bold text-cyan-700/20 transition-colors group-hover:text-cyan-500/35 dark:text-cyan-300/20">0{index + 1}</span><h3 className="mt-8 font-display text-xl font-bold">{step}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p></div>)}</div></div></section>

        <section className="rf-feature-field relative overflow-hidden border-y border-border bg-slate-950 py-24 text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(8,145,178,.32),transparent_32%),radial-gradient(circle_at_10%_80%,rgba(20,184,166,.17),transparent_28%)]" /><div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">Built for controlled recovery</p><h2 className="mt-4 font-display text-4xl font-bold tracking-[-0.035em] sm:text-5xl">One recovery system. Four visible layers of control.</h2></div><div className="mt-12 grid gap-5 md:grid-cols-2">{features.map(({ icon: Icon, index, title, copy }) => <article key={title} className="rf-tilt-card group rounded-3xl border border-white/10 bg-white/[0.055] p-6 backdrop-blur-sm"><div className="flex items-start justify-between"><span className="font-display text-sm font-bold text-cyan-200">{index}</span><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-cyan-200 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3"><Icon className="h-5 w-5" /></span></div><h3 className="mt-10 font-display text-2xl font-bold">{title}</h3><p className="mt-3 max-w-md text-sm leading-6 text-slate-300">{copy}</p><div className="mt-7 h-px w-full bg-gradient-to-r from-cyan-300/50 to-transparent" /></article>)}</div></div></section>

        <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12"><div className="rf-cta-surface relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-12 shadow-xl sm:px-12 sm:py-16"><div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" /><div className="relative max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Ready for the live demo</p><h2 className="mt-4 font-display text-4xl font-bold tracking-[-0.035em] sm:text-5xl">Enter the recovery control plane.</h2><p className="mt-4 leading-7 text-muted-foreground">Explore governed recovery paths, policy boundaries, audit evidence, and the Test Mode evaluation workspace.</p><Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-1 dark:bg-cyan-300 dark:text-slate-950">Explore the dashboard <ArrowRight className="h-4 w-4" /></Link></div></div>
        </section>
      </main>

      <footer className="border-t border-border py-8"><div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><span>RecoverFlow · controlled AI payment recovery</span><span>Razorpay Test Mode · Sandbox demonstration · no real money is moved</span></div></footer>
    </div>
  );
}

function FlowLayer({ index, title, detail, icon, tone }: { index: string; title: string; detail: string; icon: React.ReactNode; tone: "cyan" | "teal" | "violet" }) { const tones = { cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100", teal: "border-teal-300/25 bg-teal-300/10 text-teal-100", violet: "border-violet-300/25 bg-violet-300/10 text-violet-100" }; return <div className={`rf-flow-layer flex items-center gap-3 rounded-2xl border p-3 ${tones[tone]}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-950/35 text-[10px] font-bold">{index}</span><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10">{icon}</span><span className="min-w-0"><span className="block text-sm font-semibold">{title}</span><span className="block truncate text-xs opacity-75">{detail}</span></span></div>; }
function Stat({ value, label }: { value: string; label: string }) { return <div><p className="font-display text-2xl font-bold sm:text-3xl">{value}</p><p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p></div>; }
