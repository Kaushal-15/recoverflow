import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RequireAdmin } from "@/components/RequireAdmin";
import AdminLogin from "@/pages/AdminLogin";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const ReviewQueue = lazy(() => import("./pages/ReviewQueue"));
const RecoveryPolicy = lazy(() => import("./pages/RecoveryPolicy"));
const Evaluation = lazy(() => import("./pages/Evaluation"));

function ProtectedLoading() {
  return <div className="grid min-h-screen place-items-center bg-[#071318] text-cyan-200"><div className="flex items-center gap-3 text-sm font-semibold"><span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_15px_#67e8f9]" />Loading control plane…</div></div>;
}

function Router() {
  return (
    <Suspense fallback={<ProtectedLoading />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/admin/login"} component={AdminLogin} />
        <Route path={"/dashboard"} component={() => <RequireAdmin component={Dashboard} />} />
        <Route path={"/review-queue"} component={() => <RequireAdmin component={ReviewQueue} />} />
        <Route path={"/policy"} component={() => <RequireAdmin component={RecoveryPolicy} />} />
        <Route path={"/evaluation"} component={() => <RequireAdmin component={Evaluation} />} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
