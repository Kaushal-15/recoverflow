import { useTheme } from "@/contexts/ThemeContext";
import { getSceneOffset, getScrollProgress } from "@/lib/landingMotion";
import { ArrowDown, ArrowRight, BadgeCheck, Check, CircleDollarSign, DatabaseZap, LockKeyhole, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

const features = [
  {
    icon: ShieldCheck,
    number: "01",
    eyebrow: "Permission layer",
    title: "Policy before motion",
    copy: "Consent, amount caps, retry limits, confidence, and risk flags are checked before any recovery action can move.",
  },
  {
    icon: Sparkles,
    number: "02",
    eyebrow: "Reasoning layer",
    title: "AI that stays grounded",
    copy: "Diagnosis is structured, evidence-led, and restricted to the merchant-approved failure and action vocabulary.",
  },
  {
    icon: DatabaseZap,
    number: "03",
    eyebrow: "Evidence layer",
    title: "Every outcome accounted for",
    copy: "Signed outcomes, approvals, stopping reasons, and action attempts become durable audit evidence in Supabase.",
  },
];

const controlSteps = [
  ["Signal", "Razorpay Test Mode payment.failed enters through a raw-body signature boundary."],
  ["Gate", "Deterministic policy checks consent, amount, confidence, retries, and risk."],
  ["Act", "A closed action set decides between retry, link, reminder, escalation, or stop."],
  ["Record", "A verified outcome and immutable audit receipt close the loop."],
];

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const sceneRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const [judgeStep, setJudgeStep] = useState<number | null>(null);

  const judgeSteps = [
    { label: "Signal", copy: "A signed Razorpay Test Mode failure enters the recovery boundary.", target: "#how-it-works" },
    { label: "Gate", copy: "Merchant policy checks consent, cap, confidence, retry count, and risk.", target: "#scroll-ledger" },
    { label: "Act", copy: "The closed action set selects only an allowed recovery path.", target: "#safety-layers" },
    { label: "Record", copy: "The signed sandbox outcome and immutable audit evidence close the loop.", target: "#judge-finish" },
  ];

  const startJudgeMode = () => {
    setJudgeStep(0);
    window.requestAnimationFrame(() => document.querySelector(judgeSteps[0].target)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const advanceJudgeMode = () => {
    if (judgeStep === null) return;
    const nextStep = judgeStep + 1;
    if (nextStep >= judgeSteps.length) {
      setJudgeStep(null);
      return;
    }
    setJudgeStep(nextStep);
    window.requestAnimationFrame(() => document.querySelector(judgeSteps[nextStep].target)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  useEffect(() => {
    let frame = 0;
    const updateProgress = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const progress = getScrollProgress(window.scrollY, document.documentElement.scrollHeight, window.innerHeight);
        const scene = sceneRef.current;
        const consoleSurface = consoleRef.current;
        if (!scene || !consoleSurface) return;
        scene.style.setProperty("--rf-progress", String(progress));
        scene.style.setProperty("--rf-card-a-x", `${getSceneOffset(progress, -34)}px`);
        scene.style.setProperty("--rf-card-a-y", `${getSceneOffset(progress, 18)}px`);
        scene.style.setProperty("--rf-card-b-x", `${getSceneOffset(progress, 42)}px`);
        scene.style.setProperty("--rf-card-b-y", `${getSceneOffset(progress, -22)}px`);
        scene.style.setProperty("--rf-card-c-y", `${getSceneOffset(progress, -42)}px`);
        consoleSurface.style.setProperty("--rf-console-x", `${getSceneOffset(progress, 36)}px`);
        consoleSurface.style.setProperty("--rf-console-y", `${getSceneOffset(progress, -28)}px`);
        consoleSurface.style.setProperty("--rf-console-rotate", `${getSceneOffset(progress, -5)}deg`);
        consoleSurface.style.setProperty("--rf-console-progress", String(progress));
      });
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="rf-public min-h-screen overflow-x-hidden bg-[#e5e8e8] text-slate-950 dark:bg-[#071318] dark:text-white">
      <nav className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="group flex items-center gap-3">
          <span className="rf-logo-mark grid h-10 w-10 place-items-center rounded-2xl text-white shadow-lg"><ShieldCheck className="h-5 w-5" /></span>
          <span><span className="font-display block text-base font-bold tracking-tight">RecoverFlow</span><span className="block text-[10px] font-bold uppercase tracking-[0.17em] text-slate-500 dark:text-slate-400">Control plane</span></span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full border border-slate-300 bg-white/60 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-slate-300 sm:block">Razorpay Test Mode</span>
          <button onClick={() => toggleTheme?.()} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 bg-white/70 text-slate-700 transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-200" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <span aria-hidden="true">☼</span> : <span aria-hidden="true">◐</span>}
          </button>
          <Link href="/dashboard" className="hidden rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-slate-800 sm:block dark:bg-cyan-300 dark:text-slate-950">Explore dashboard</Link>
        </div>
      </nav>

      <main>
        <section className="rf-hero-frame relative mx-4 overflow-hidden rounded-[2.3rem] border border-white/70 bg-[#0a1113] text-white shadow-[0_30px_90px_-35px_rgba(8,24,31,.7)] sm:mx-6 lg:mx-8">
          <div className="rf-hero-noise pointer-events-none absolute inset-0 opacity-70" />
          <div className="rf-hero-glow rf-hero-glow-one pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full blur-3xl" />
          <div className="rf-hero-glow rf-hero-glow-two pointer-events-none absolute right-0 top-0 h-[32rem] w-[32rem] rounded-full blur-3xl" />
          <div className="relative mx-auto grid min-h-[690px] max-w-[1440px] items-center gap-10 px-6 py-16 sm:px-10 sm:py-20 lg:grid-cols-[.78fr_1.22fr] lg:px-16 lg:py-24">
            <div className="relative z-10 max-w-xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100"><BadgeCheck className="h-3.5 w-3.5" /> Recovery, under control</div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Payment recovery infrastructure for Razorpay Test Mode</p>
              <h1 className="font-display text-[3.6rem] font-semibold leading-[.91] tracking-[-0.075em] sm:text-7xl lg:text-[6.6rem]">Move money<br /><span className="text-cyan-300">with permission.</span></h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">RecoverFlow turns failed payments into a visible, policy-gated recovery journey. AI explains the signal. Your policy decides what may move.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/dashboard" className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-[0_18px_45px_-18px_rgba(103,232,249,.8)] transition-all hover:-translate-y-1 hover:bg-cyan-200">Explore the dashboard <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <button onClick={startJudgeMode} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/30 bg-cyan-200/10 px-5 py-3.5 text-sm font-semibold text-cyan-50 transition-all hover:-translate-y-1 hover:bg-cyan-200/20">Launch Judge Mode <Workflow className="h-4 w-4" /></button>
                <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-1 hover:bg-white/10">See the control loop <ArrowDown className="h-4 w-4" /></a>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-slate-400"><span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" /> Immutable evidence</span><span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" /> Server-side credentials</span><span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" /> Test Mode only</span></div>
            </div>

            <div ref={sceneRef} className="rf-payment-scene relative mx-auto min-h-[470px] w-full max-w-[700px] [perspective:1500px]" aria-label="Interactive 3D recovery flow visualization">
              <div className="rf-scene-ring rf-scene-ring-one" /><div className="rf-scene-ring rf-scene-ring-two" />
              <div className="rf-scene-grid" />
              <div className="rf-payment-card rf-payment-card-a">
                <span className="rf-card-brand">razorpay</span>
                <span className="rf-card-chip" />
                <span className="rf-card-label">PAYMENT FAILED</span>
                <strong>₹486.00</strong>
                <span className="rf-card-meta">Test Mode · payment.failed</span>
              </div>
              <div className="rf-payment-card rf-payment-card-b">
                <span className="rf-card-brand">recoverflow</span>
                <span className="rf-card-chip rf-card-chip-soft" />
                <span className="rf-card-label">POLICY GATE</span>
                <strong>VERIFIED</strong>
                <span className="rf-card-meta">Consent · cap · confidence</span>
              </div>
              <div className="rf-payment-card rf-payment-card-c">
                <div className="flex items-center justify-between"><span className="rf-card-label">RECOVERY PATH</span><span className="rf-live-dot" /></div>
                <strong>Payment Link</strong>
                <span className="rf-card-meta">Awaiting signed outcome</span>
              </div>
              <div className="rf-scene-core">
                <span className="rf-core-mark"><ShieldCheck className="h-7 w-7" /></span>
                <span className="mt-3 block text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100">Control plane</span>
                <span className="mt-1 block text-sm font-semibold text-white">verify · act · record</span>
              </div>
              <div className="rf-scene-proof"><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Recovery evidence</span><strong>56.2%</strong><span className="text-xs text-slate-400">held-out replay</span></div>
              <div className="rf-scene-progress" aria-hidden="true"><span /></div>
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500"><span>Scroll to move the flow</span><span>01 — 04</span></div>
            </div>
          </div>
          <div className="relative border-t border-white/10 px-6 py-5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:px-10 sm:text-left">A safer recovery system is not invisible automation. It is permission, in motion.</div>
        </section>

        <section className="mx-auto grid max-w-[1440px] grid-cols-2 gap-6 px-8 py-10 sm:grid-cols-4 lg:px-16"><Stat value="200" label="deterministic cases" /><Stat value="40" label="held-out records" /><Stat value="5" label="bounded actions" /><Stat value="1" label="immutable trail" /></section>

        <section id="how-it-works" className="mx-auto max-w-[1440px] px-8 py-24 lg:px-16"><div className="grid gap-14 lg:grid-cols-[.72fr_1.28fr] lg:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">The scroll story</p><h2 className="mt-4 max-w-lg font-display text-4xl font-semibold leading-[.98] tracking-[-0.05em] sm:text-6xl">A failed payment becomes a controlled path.</h2><p className="mt-6 max-w-md text-base leading-7 text-slate-600 dark:text-slate-300">The 3D scene is a visual metaphor for the actual system: the signal can move through the stack only after each visible gate passes.</p><Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-cyan-700 transition-colors hover:text-cyan-500 dark:text-cyan-300">Open the control plane <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-4 sm:grid-cols-2">{controlSteps.map(([step, copy], index) => <div key={step} className="rf-step-card group relative overflow-hidden rounded-[1.65rem] border border-slate-300/80 bg-white/65 p-6 shadow-[0_18px_55px_-35px_rgba(7,34,44,.45)] dark:border-white/10 dark:bg-white/[.055]"><div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-cyan-300/15 blur-2xl transition-transform duration-500 group-hover:scale-150" /><span className="relative font-display text-5xl font-semibold text-cyan-700/20 dark:text-cyan-300/25">0{index + 1}</span><h3 className="relative mt-8 font-display text-2xl font-semibold">{step}</h3><p className="relative mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy}</p></div>)}</div></div></section>

        <section id="scroll-ledger" className="rf-scroll-lab relative overflow-hidden border-y border-slate-200/70 bg-[#dce3e2] px-8 py-24 dark:border-white/10 dark:bg-[#0b191d] lg:px-16"><div className="rf-lab-orb rf-lab-orb-a" /><div className="rf-lab-orb rf-lab-orb-b" /><div className="relative mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[.72fr_1.28fr] lg:items-center"><div className="relative z-10"><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-800 dark:text-cyan-200">Scroll the ledger</p><h2 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-[.98] tracking-[-0.05em] sm:text-6xl">From signal to signed outcome.</h2><p className="mt-6 max-w-md text-base leading-7 text-slate-600 dark:text-slate-300">As the page moves, the recovery trace moves with it. Every layer is a permission boundary—not decoration.</p><div className="mt-8 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_16px_#67e8f9]" /> Live trace · scroll to inspect</div></div><div ref={consoleRef} className="rf-depth-console relative min-h-[530px]"><div className="rf-console-floor" /><div className="rf-console-rail"><span /><span /><span /><span /></div><div className="rf-console-node rf-console-node-one"><b>01</b><span>Signal</span><small>raw event</small></div><div className="rf-console-node rf-console-node-two"><b>02</b><span>Gate</span><small>policy passed</small></div><div className="rf-console-node rf-console-node-three"><b>03</b><span>Act</span><small>link queued</small></div><div className="rf-console-node rf-console-node-four"><b>04</b><span>Record</span><small>signed outcome</small></div><div className="rf-console-card"><div className="flex items-center justify-between border-b border-white/10 pb-4"><span className="text-[10px] font-bold uppercase tracking-[0.17em] text-cyan-200">RecoverFlow / live trace</span><span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[9px] font-bold text-emerald-200">SAFE</span></div><div className="rf-console-row"><span>Payment</span><strong>₹486.00</strong></div><div className="rf-console-row"><span>Policy</span><strong className="text-cyan-200">verified</strong></div><div className="rf-console-row"><span>Outcome</span><strong className="text-slate-300">awaiting signed event</strong></div><div className="mt-5 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500"><span className="rf-console-dot" /> Test Mode · no real money moved</div></div></div></div></section>

        <section id="safety-layers" className="rf-feature-field relative overflow-hidden bg-[#0b1518] px-8 py-24 text-white lg:px-16"><div className="rf-field-glow pointer-events-none absolute -right-20 top-0 h-96 w-96 rounded-full blur-3xl" /><div className="relative mx-auto max-w-[1440px]"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Three layers, one permission boundary</p><h2 className="mt-4 font-display text-4xl font-semibold leading-[.98] tracking-[-0.05em] sm:text-6xl">The model can see the signal. Your policy holds the keys.</h2></div><div className="mt-14 grid gap-5 lg:grid-cols-3">{features.map(({ icon: Icon, number, eyebrow, title, copy }) => <article key={title} className="rf-tilt-card group rounded-[1.8rem] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-sm"><div className="flex items-start justify-between"><div><span className="text-xs font-bold text-cyan-200">{number}</span><p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-cyan-200 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3"><Icon className="h-5 w-5" /></span></div><h3 className="mt-12 font-display text-2xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{copy}</p><div className="mt-8 h-px w-full bg-gradient-to-r from-cyan-300/60 to-transparent" /></article>)}</div></div></section>

        <section id="judge-finish" className="mx-auto max-w-[1440px] px-8 py-24 lg:px-16"><div className="rf-cta-surface relative overflow-hidden rounded-[2rem] border border-slate-300 bg-white/65 px-7 py-14 shadow-[0_26px_80px_-45px_rgba(7,34,44,.5)] dark:border-white/10 dark:bg-white/[.055] sm:px-14"><div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" /><div className="relative max-w-2xl"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300"><LockKeyhole className="h-3.5 w-3.5" /> Ready for the live demo</div><h2 className="mt-5 font-display text-4xl font-semibold leading-[.98] tracking-[-0.05em] sm:text-6xl">Enter the recovery control plane.</h2><p className="mt-5 max-w-xl leading-7 text-slate-600 dark:text-slate-300">Inspect governed recovery cases, approval boundaries, immutable evidence, and explicitly sandboxed Razorpay Test Mode outcomes.</p><Link href="/dashboard" className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-1 dark:bg-cyan-300 dark:text-slate-950">Explore the dashboard <ArrowRight className="h-4 w-4" /></Link></div></div></section>
      </main>

      <footer className="border-t border-slate-300/70 px-8 py-8 dark:border-white/10"><div className="mx-auto flex max-w-[1440px] flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>RecoverFlow · controlled AI payment recovery</span><span>Razorpay Test Mode · sandbox demonstration · no real money is moved</span></div></footer>
      {judgeStep !== null && <div className="rf-judge-dock" role="dialog" aria-label="RecoverFlow Judge Mode" aria-live="polite"><div className="rf-judge-dock-top"><span className="rf-judge-kicker">Judge Mode · Test Mode only</span><button onClick={() => setJudgeStep(null)} aria-label="Close Judge Mode" className="rf-judge-close">×</button></div><div className="rf-judge-progress" aria-hidden="true"><span style={{ width: `${((judgeStep + 1) / judgeSteps.length) * 100}%` }} /></div><div className="rf-judge-copy"><span className="rf-judge-index">0{judgeStep + 1}</span><div><strong>{judgeSteps[judgeStep].label}</strong><p>{judgeSteps[judgeStep].copy}</p></div></div><button onClick={advanceJudgeMode} className="rf-judge-next">{judgeStep === judgeSteps.length - 1 ? "Finish walkthrough" : "Next evidence"}<ArrowRight className="h-4 w-4" /></button></div>}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div><p className="font-display text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{value}</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p></div>;
}
