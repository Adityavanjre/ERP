"use client";

import { useEffect, useState } from "react";
import { Navbar } from "../../components/layout/navbar";
import { Sidebar } from "../../components/layout/sidebar";
import AuthGuard from "../../components/auth/auth-guard";
import { CommandPalette } from "../../components/layout/command-palette";
import { jwtDecode } from "jwt-decode";
import { Loader2 } from "lucide-react";
import { DraftRecovery } from "../../components/auth/draft-recovery";
import {
  hydrateDesktopOfflineSession,
  isDesktopShell,
} from "../../lib/desktop-offline";

interface DecodedToken {
  type?: string;
  tenantId?: string;
  [key: string]: string | number | boolean | undefined;
}

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [isIdentityState, setIsIdentityState] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      console.log("[DashboardLayout] bootstrap started");
      try {
        const isShell = isDesktopShell();
        console.log("[DashboardLayout] isDesktopShell:", isShell);
        if (isShell) {
          console.log("[DashboardLayout] hydrating desktop offline session");
          // Wrap in a 2-second timeout to prevent IPC bridge hangs from blocking the UI forever
          await Promise.race([
            hydrateDesktopOfflineSession(),
            new Promise((resolve) => setTimeout(resolve, 2000))
          ]);
        }
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("k_token")
            : null;
        console.log("[DashboardLayout] token found:", !!token);
        if (token) {
          const decoded = jwtDecode<DecodedToken>(token);
          console.log("[DashboardLayout] decoded token:", decoded);
          if (!cancelled) {
            const isId =
              decoded.type === "identity" ||
              (decoded.type === "admin" && !decoded.tenantId);
            console.log("[DashboardLayout] setting identity state:", isId);
            setIsIdentityState(isId);
          } else {
            console.log("[DashboardLayout] cancelled was true during decode");
          }
        } else if (!cancelled) {
          console.log("[DashboardLayout] setting identity state to false (no token)");
          setIsIdentityState(false);
        } else {
          console.log("[DashboardLayout] cancelled was true (no token)");
        }
      } catch (err) {
        console.error("[DashboardLayout] bootstrap error:", err);
        if (!cancelled) {
          setIsIdentityState(false);
        }
      }
    };

    void bootstrap();

    return () => {
      console.log("[DashboardLayout] useEffect cleanup (cancelled = true)");
      cancelled = true;
    };
  }, []);

  // Prevent hydration flashes
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

  return (
    <AuthGuard>
      <div className="h-screen bg-white text-slate-900 overflow-hidden relative">
        <CommandPalette />
        <div className="hidden h-full md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 z-[80] border-r border-slate-100 bg-slate-50/50">
          <Sidebar />
        </div>
        <div className="md:pl-60 h-full flex flex-col overflow-hidden">
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

export default DashboardLayout;

