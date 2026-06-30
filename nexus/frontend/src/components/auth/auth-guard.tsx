"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { hydrateDesktopOfflineSession, isDesktopShell } from "../../lib/desktop-offline";

// Route-level access control matrix
// Maps path prefixes to allowed roles
const ROUTE_ACCESS: Record<string, string[]> = {
  "/sales/rapid": ["Owner", "Manager", "Biller"],
  "/crm": ["Owner", "Manager", "Biller"],
  "/sales": ["Owner", "Manager", "Biller", "Accountant", "CA"],
  "/inventory": ["Owner", "Manager", "Storekeeper"],
  "/purchases": ["Owner", "Manager", "Storekeeper"],
  "/manufacturing": ["Owner", "Manager", "Storekeeper"],
  "/accounting": ["Owner", "Manager", "Accountant", "CA"],
  "/settings": ["Owner"],
  "/apps": ["Owner", "Manager"],
};

import { TenantSelector } from "./TenantSelector";

interface DecodedToken {
  role?: string;
  type?: string;
  isOnboarded?: boolean;
  tenantId?: string;
}

function isRouteAllowed(pathname: string, role: string): boolean {
  // Dashboard is always accessible
  if (pathname === "/dashboard") return true;

  // Check route access rules - match the most specific path first
  const sortedRoutes = Object.keys(ROUTE_ACCESS).sort(
    (a, b) => b.length - a.length,
  );
  for (const route of sortedRoutes) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      return ROUTE_ACCESS[route].includes(role);
    }
  }

  // Default: allow access (for routes not in the matrix, e.g. /dashboard)
  return true;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [needsTenantSelection, setNeedsTenantSelection] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const handleSessionExpired = () => {
      console.log("[AuthGuard] session-expired event received");
      setAuthorized(false);
      router.push("/login");
    };

    window.addEventListener("session-expired", handleSessionExpired);

    const checkAuth = async () => {
      console.log("[AuthGuard] checkAuth started, pathname:", pathname);
      try {
        await hydrateDesktopOfflineSession();
        const token = localStorage.getItem("k_token");
        console.log("[AuthGuard] token found:", !!token);
        if (!token) {
          console.log("[AuthGuard] no token, redirecting to /login");
          router.push("/login");
          return;
        }

        let decoded: DecodedToken;
        if (token.startsWith("offline_")) {
          const userStr = localStorage.getItem("k_user");
          const user = userStr ? JSON.parse(userStr) : null;
          decoded = {
            type: "desktop-local",
            isOnboarded: true,
            role: user?.isSuperAdmin ? "Owner" : "Manager"
          };
        } else {
          decoded = jwtDecode<DecodedToken>(token);
        }
        console.log("[AuthGuard] decoded token:", decoded);
        const role = decoded.role;
        const type = decoded.type;
        const isOnboarded = decoded.isOnboarded;
        const tenantId = decoded.tenantId;
        const isDesktopLocal = type === "desktop-local";

        // 1. Identity/Admin Token handling (No specific tenant scoped yet)
        if (type === "identity" || (type === "admin" && !tenantId)) {
          console.log("[AuthGuard] identity token, pathname:", pathname);
          if (pathname === "/onboarding") {
            console.log("[AuthGuard] onboarding path, authorizing identity");
            setAuthorized(true);
            return;
          }
          console.log("[AuthGuard] setting needsTenantSelection = true");
          setNeedsTenantSelection(true);
          setAuthorized(true);
          return;
        }

        if (isDesktopLocal) {
          console.log("[AuthGuard] desktop-local session, isOnboarded:", isOnboarded);
          // Desktop app loads at /portal which matches Next.js basePath
          // Both desktop and cloud use the same routes; basePath is handled by Next.js
          const onboardingPath = "/onboarding";
          if (isOnboarded === false && pathname !== onboardingPath) {
            router.push(onboardingPath);
            return;
          }

          if (isOnboarded === true && pathname === onboardingPath) {
            router.push("/dashboard");
            return;
          }

          if (!cancelled) {
            setNeedsTenantSelection(false);
            setAuthorized(true);
          }
          return;
        }

        // 2. Tenant Scoped handling
        if (!role) {
          console.log("[AuthGuard] no role in token, redirecting to /login");
          router.push("/login");
          return;
        }

        // Onboarding Enforcement
        // Desktop app loads at /portal which matches Next.js basePath
        // Both desktop and cloud use the same routes; basePath is handled by Next.js
        const onboardingPath = "/onboarding";
        if (isOnboarded === false && pathname !== onboardingPath) {
          console.log("[AuthGuard] not onboarded, redirecting to:", onboardingPath);
          router.push(onboardingPath);
          return;
        }

        // If onboarded, don't stay on onboarding page
        if (isOnboarded === true && pathname === onboardingPath) {
          console.log("[AuthGuard] onboarded, redirecting from", onboardingPath, "to /dashboard");
          router.push("/dashboard");
          return;
        }

        // Role-based route access
        if (!isRouteAllowed(pathname, role)) {
          console.log("[AuthGuard] route not allowed for role:", role, "redirecting to /dashboard");
          router.push("/dashboard");
          return;
        }

        if (!cancelled) {
          console.log("[AuthGuard] authorizing access");
          setAuthorized(true);
        }
      } catch (err) {
        console.error("[AuthGuard] checkAuth error:", err);
        router.push("/login");
      }
    };

    void checkAuth();

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "k_token" || e.key === "k_user") {
        console.log("[AuthGuard] storage key changed:", e.key);
        void checkAuth();
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      console.log("[AuthGuard] cleanup (cancelled = true)");
      cancelled = true;
      window.removeEventListener("session-expired", handleSessionExpired);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [router, pathname]);

  if (!authorized) {
    return (
      <div className="flex bg-slate-50 h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm font-medium">
            Verifying access...
          </span>
        </div>
      </div>
    );
  }

  if (needsTenantSelection) {
    return <TenantSelector />;
  }

  return <>{children}</>;
}
