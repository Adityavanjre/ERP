"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { AlertCircle, LogOut, ShieldCheck } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import { isDesktopOfflineMode } from "../../lib/desktop-offline";
import { jwtDecode } from "jwt-decode";
import {
  denyNetworkConsent,
  grantNetworkConsent,
  hasNetworkConsent,
  hasPendingNetworkConsentRequest,
  NETWORK_CONSENT_REQUESTED_EVENT,
  recordUserInteraction,
  revokeNetworkConsent,
} from "../../lib/network-consent";
import { api } from "../../lib/api";

interface UserToken {
  isOnboarded?: boolean;
}

interface PBACState {
  permissions: Record<string, string[]>;
  modules: string[];
}

interface UXContextType {
  showConfirm: (options: ConfirmOptions) => void;
  triggerSessionExpiry: () => void;
  setUILocked: (locked: boolean) => void;
  pbac: PBACState;
  hasPermission: (resource: string, action: string) => boolean;
  hasModule: (moduleName: string) => boolean;
}

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
}

const UXContext = createContext<UXContextType | undefined>(undefined);

export function UXProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(
    null,
  );
  const [isNetworkConsentOpen, setIsNetworkConsentOpen] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [isUILocked, setIsUILocked] = useState(false);
  const [pbac, setPbac] = useState<PBACState>({ permissions: {}, modules: [] });

  const hasPermission = (resource: string, action: string) => {
    if (pbac.permissions["*"]?.includes("*")) return true;
    return pbac.permissions[resource]?.includes(action) || false;
  };

  const hasModule = (moduleName: string) => {
    return pbac.modules.includes(moduleName);
  };

  const showConfirm = (options: ConfirmOptions) => {
    setConfirmOptions(options);
  };

  const setUILocked = (locked: boolean) => {
    setIsUILocked(locked);
  };

  const triggerSessionExpiry = () => {
    setIsSessionExpired(true);
  };

  const handleConfirm = () => {
    if (confirmOptions) {
      confirmOptions.onConfirm();
      setConfirmOptions(null);
    }
  };

  const handleLoginRedirect = () => {
    setIsSessionExpired(false);
    revokeNetworkConsent();
    // Save current path to restore state after login
    if (typeof window !== "undefined") {
      // Stripping the basePath if it exists to avoid double-prefixing on redirect
      const currentPath = window.location.pathname;
      const cleanPath = currentPath.startsWith("/portal")
        ? currentPath.replace("/portal", "")
        : currentPath;

      localStorage.setItem("return_to", cleanPath || "/");
      router.push("/login"); // router.push handles /portal automatically
    }
  };

  const pathname = usePathname();

  useEffect(() => {
    // Global listener for custom events if needed
    const handleSessionExpiry = () => {
      // DESKTOP-OFFLINE: Ignore session expiry in offline mode.
      // There is no cloud session to expire, and this prevents erroneous 401 triggers
      // from interrupting the localized industrial suite.
      if (isDesktopOfflineMode()) {
        return;
      }

      // Don't trigger if we are already on auth pages
      const authPages = [
        "/login",
        "/forgot-password",
        "/reset-password",
      ];
      if (authPages.some((page) => pathname?.includes(page))) {
        return;
      }
      revokeNetworkConsent();
      setIsSessionExpired(true);
    };
    window.addEventListener("session-expired", handleSessionExpiry);
    return () =>
      window.removeEventListener("session-expired", handleSessionExpiry);
  }, [pathname]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await api.get("/sync/metadata");
        if (res.data) {
          setPbac({
            permissions: res.data.permissions || {},
            modules: res.data.modules || [],
          });
        }
      } catch (err) {
        console.warn("Failed to fetch PBAC metadata", err);
      }
    };
    // Don't fetch on auth pages
    if (!pathname?.includes("/login") && !pathname?.includes("/forgot-password")) {
      fetchMetadata();
    }
  }, [pathname]);

  useEffect(() => {
    const markInteraction = () => {
      recordUserInteraction();
    };

    window.addEventListener("pointerdown", markInteraction, { capture: true });
    window.addEventListener("keydown", markInteraction, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", markInteraction, {
        capture: true,
      });
      window.removeEventListener("keydown", markInteraction, { capture: true });
    };
  }, []);

  useEffect(() => {
    const openNetworkConsent = () => {
      if (!hasNetworkConsent()) {
        setIsNetworkConsentOpen(true);
      }
    };

    if (hasPendingNetworkConsentRequest()) {
      openNetworkConsent();
    }

    window.addEventListener(
      NETWORK_CONSENT_REQUESTED_EVENT,
      openNetworkConsent,
    );
    return () =>
      window.removeEventListener(
        NETWORK_CONSENT_REQUESTED_EVENT,
        openNetworkConsent,
      );
  }, []);

  // Desktop-Offline: First-run Onboarding Redirect
  useEffect(() => {
    if (typeof window === "undefined" || !isDesktopOfflineMode()) return;

    const token = localStorage.getItem("k_token");
    if (!token) return;

    try {
      let decoded: UserToken;
      if (token.startsWith("offline_")) {
        decoded = { isOnboarded: true }; // Offline mode implies onboarded via local flow
      } else {
        decoded = jwtDecode<UserToken>(token);
      }
      // If the user isn't onboarded and we aren't already there, go to onboarding
      if (
        decoded.isOnboarded === false &&
        !pathname?.startsWith("/onboarding")
      ) {
        router.push("/onboarding");
      }
    } catch (e) {
      console.error("Failed to decode token for onboarding check", e);
    }
  }, [pathname, router]);

  return (
    <UXContext.Provider
      value={{ showConfirm, triggerSessionExpiry, setUILocked, pbac, hasPermission, hasModule }}
    >
      {children}

      {/* UI Lock Overlay */}
      {isUILocked && (
        <div className="fixed inset-0 z-[99999] bg-white/80 backdrop-blur-md flex items-center justify-center cursor-wait animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
            <div className="text-slate-900 font-bold text-[10px] tracking-widest uppercase animate-pulse">
              Processing Request...
            </div>
          </div>
        </div>
      )}

      {/* Global Confirm Dialog */}
      <Dialog
        open={!!confirmOptions}
        onOpenChange={(open) => !open && setConfirmOptions(null)}
      >
        <DialogContent className="w-11/12 sm:min-w-fit bg-white border-slate-200 text-slate-900 rounded-[2rem] p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
              {confirmOptions?.variant === "destructive" && (
                <AlertCircle className="h-5 w-5 text-rose-500" />
              )}
              {confirmOptions?.title || "Confirm Action"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              {confirmOptions?.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-2 mt-6">
            <Button
              variant="ghost"
              className="font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl"
              onClick={() => setConfirmOptions(null)}
            >
              {confirmOptions?.cancelText || "Cancel"}
            </Button>
            <Button
              variant={
                confirmOptions?.variant === "destructive"
                  ? "destructive"
                  : "default"
              }
              className={cn(
                "rounded-xl font-black uppercase tracking-wider text-[10px] h-11 px-6",
                confirmOptions?.variant !== "destructive"
                  ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                  : "",
              )}
              onClick={handleConfirm}
            >
              {confirmOptions?.confirmText || "Execute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isNetworkConsentOpen}
        onOpenChange={(open) => {
          if (!open) {
            denyNetworkConsent();
            setIsNetworkConsentOpen(false);
          }
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-[460px] rounded-[2.5rem] p-8 shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="h-16 w-16 rounded-3xl bg-blue-50 flex items-center justify-center mb-6">
              <ShieldCheck className="h-8 w-8 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">
              Allow Server Access?
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium leading-relaxed">
              This app is paused before contacting the server. Nothing will be
              sent until you explicitly approve network access for this session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8 gap-3 sm:gap-3">
            <Button
              variant="ghost"
              className="w-full sm:w-auto rounded-xl font-black uppercase tracking-widest text-[10px]"
              onClick={() => {
                denyNetworkConsent();
                setIsNetworkConsentOpen(false);
              }}
            >
              Stay Offline
            </Button>
            <Button
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black h-12 rounded-xl transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest text-[10px]"
              onClick={() => {
                recordUserInteraction();
                grantNetworkConsent();
                setIsNetworkConsentOpen(false);
              }}
            >
              Allow Requests
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Expired Modal */}
      <Dialog open={isSessionExpired} onOpenChange={() => {}}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-[400px] rounded-[2.5rem] p-8 shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="h-16 w-16 rounded-3xl bg-rose-50 flex items-center justify-center mb-6">
              <LogOut className="h-8 w-8 text-rose-500" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">
              Session Terminated
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium leading-relaxed">
              Your security token has expired. For your safety, we've
              locked the session. Please re-authenticate to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-12 rounded-xl transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest text-[10px]"
              onClick={handleLoginRedirect}
            >
              Return to Safe Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UXContext.Provider>
  );
}

export const useUX = () => {
  const context = useContext(UXContext);
  if (!context) throw new Error("useUX must be used within a UXProvider");
  return context;
};

