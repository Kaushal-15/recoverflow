import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, ClipboardCheck, LayoutDashboard, LogOut, Moon, PanelLeft, Settings2, ShieldCheck, Sun } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Recovery overview", path: "/dashboard" },
  { icon: ClipboardCheck, label: "Review queue", path: "/review-queue" },
  { icon: Settings2, label: "Recovery policy", path: "/policy" },
  { icon: BarChart3, label: "Evaluation", path: "/evaluation" },
];
const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || DEFAULT_WIDTH);
  const { loading, profile } = useAdminAuth();
  useEffect(() => localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)), [sidebarWidth]);
  if (loading || !profile) return <DashboardLayoutSkeleton />;
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { profile, signOut, isDemoViewer } = useAdminAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const activeMenuItem = menuItems.find(item => item.path === location);
  useEffect(() => {
    const move = (event: MouseEvent) => { if (!isResizing) return; const left = sidebarRef.current?.getBoundingClientRect().left ?? 0; const width = event.clientX - left; if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width); };
    const up = () => setIsResizing(false);
    if (isResizing) { document.addEventListener("mousemove", move); document.addEventListener("mouseup", up); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
  }, [isResizing, setSidebarWidth]);
  return <><div className="relative" ref={sidebarRef}><Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}><SidebarHeader className="h-[76px] justify-center border-b border-sidebar-border/70"><div className="flex w-full items-center gap-3 px-3"><button onClick={toggleSidebar} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring" aria-label="Toggle navigation"><PanelLeft className="h-4 w-4 text-muted-foreground" /></button>{!isCollapsed && <div className="flex min-w-0 flex-1 items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-900/20"><ShieldCheck className="h-4.5 w-4.5" /></div><div className="min-w-0"><span className="font-display block truncate text-sm font-bold tracking-tight">RecoverFlow</span><span className="block truncate text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{isDemoViewer ? "Demo Viewer (Read-Only)" : "Admin control plane"}</span></div></div>}<button onClick={toggleTheme} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button></div></SidebarHeader><SidebarContent className="gap-0"><SidebarMenu className="px-3 py-4">{menuItems.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className={`h-11 rounded-xl font-medium transition-all ${location === item.path ? "shadow-sm" : "hover:translate-x-0.5"}`}><item.icon className={`h-4 w-4 ${location === item.path ? "text-primary" : ""}`} /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter className="border-t border-sidebar-border/70 p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-accent/50 group-data-[collapsible=icon]:justify-center"><Avatar className="h-9 w-9 border shrink-0"><AvatarFallback className="text-xs font-medium">{profile?.display_name?.charAt(0).toUpperCase() ?? profile?.email.charAt(0).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium leading-none">{profile?.display_name || (isDemoViewer ? "Demo Viewer" : "RecoverFlow admin")}</p><p className="mt-1.5 truncate text-xs text-muted-foreground">{profile?.email}</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuItem onClick={() => void signOut()} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><div className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/20 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => !isCollapsed && setIsResizing(true)} /></div><SidebarInset>{isMobile && <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 px-3 backdrop-blur"><div className="flex items-center gap-2"><SidebarTrigger className="h-9 w-9 rounded-lg bg-background" /><div className="flex flex-col gap-1"><span className="font-display text-foreground">{activeMenuItem?.label ?? "RecoverFlow"}</span><span className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{isDemoViewer ? "Demo Viewer (Read-Only)" : "Admin control plane"}</span></div></div><button onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-secondary-foreground" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button></div>}<main className="flex-1 p-4">{children}</main></SidebarInset></>;
}
