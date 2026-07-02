"use client";

import { useEffect, useState } from "react";
import { Navbar } from "../../components/layout/navbar";
import { Sidebar } from "../../components/layout/sidebar";
import AuthGuard from "../../components/auth/auth-guard";
import { CommandPalette } from "../../components/layout/command-palette";
import { jwtDecode } from "jwt-decode";
import { Loader2 } from "lucide-react";
import { DraftRecovery } from "../../components/auth/draft-recovery";
import { SidebarProvider, useSidebar } from "../../components/providers/sidebar-provider";
import {
  hydrateDesktopOfflineSession,
  isDesktopShell,
} from "../../lib/desktop-offline";

interface DecodedToken {
  type?: string;
  tenantId?: string;
  [key: string]: string | number | boolean | undefined;
}

const DashboardLayoutInner = ({ children }: { children: React.ReactNode }) => {
  const [isIdentityState, setIsIdentityState] = useState<boolean | null>(null);
  const { collapsed } = useSidebar();

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const isShell = isDesktopShell();
        if (isShell) {
          await Promise.race([
            hydrateDesktopOfflineSession(),
            new Promise((resolve) => setTimeout(resolve, 2000))
          ]);
        }
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("k_token")
            : null;
        if (token) {
          const decoded = jwtDecode<DecodedToken>(token);
          if (!cancelled) {
            const isId =
              decoded.type === "identity" ||
              (decoded.type === "admin" && !decoded.tenantId);
            setIsIdentityState(isId);
          }
        } else if (!cancelled) {
          setIsIdentityState(false);
        }
      } catch (err) {
        console.error("[DashboardLayout] bootstrap error:", err);
        if (!cancelled) {
          setIsIdentityState(false);
        }
      }
    };

    void bootstrap();
    return () => { cancelled = true; };
  }, []);

  if (isIdentityState === null) {
    return (
      <div className="flex flex-col bg-slate-50 h-screen w-screen items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-blue-600 font-bold tracking-widest text-[10px] uppercase">Verifying Session...</span>
      </div>
    );
  }

  if (isIdentityState) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  const sidebarWidth = collapsed ? "w-16" : "w-60";
  const plValue = collapsed ? "md:pl-16" : "md:pl-60";

  return (
    <AuthGuard>
      <div className="h-screen bg-white text-slate-900 overflow-hidden relative">
        <CommandPalette />
        <div className={`hidden h-full md:flex ${sidebarWidth} md:flex-col md:fixed md:inset-y-0 z-[80] border-r border-slate-100 bg-slate-50/50 transition-all duration-300`}>
          <Sidebar />
        </div>
        <div className={`${plValue} h-full flex flex-col overflow-hidden transition-all duration-300`}>
          <Navbar />
          <DraftRecovery />
          <main className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="max-w-[1700px] mx-auto min-h-full p-4 md:p-5">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </SidebarProvider>
  );
};

export default DashboardLayout;

