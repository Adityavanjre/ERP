"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { hydrateDesktopOfflineSession } from "@/lib/desktop-offline";

// Route-level access control matrix
// Maps path prefixes to allowed roles
const ROUTE_ACCESS: Record<string, string[]> = {
    '/sales/rapid': ['Owner', 'Manager', 'Biller'],
    '/crm': ['Owner', 'Manager', 'Biller'],
    '/sales': ['Owner', 'Manager', 'Biller', 'Accountant', 'CA'],
    '/inventory': ['Owner', 'Manager', 'Storekeeper'],
    '/purchases': ['Owner', 'Manager', 'Storekeeper'],
    '/manufacturing': ['Owner', 'Manager', 'Storekeeper'],
    '/accounting': ['Owner', 'Manager', 'Accountant', 'CA'],
    '/settings': ['Owner'],
    '/apps': ['Owner', 'Manager'],
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
    if (pathname === '/dashboard') return true;

    // Check route access rules - match the most specific path first
    const sortedRoutes = Object.keys(ROUTE_ACCESS).sort((a, b) => b.length - a.length);
    for (const route of sortedRoutes) {
        if (pathname === route || pathname.startsWith(route + '/')) {
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
            setAuthorized(false);
            router.push("/login");
        };

        window.addEventListener('session-expired', handleSessionExpired);

        const checkAuth = async () => {
            await hydrateDesktopOfflineSession();
            const token = localStorage.getItem("k_token");
            if (!token) {
                router.push("/login");
                return;
            }

            try {
                const decoded = jwtDecode<DecodedToken>(token);
                const role = decoded.role;
                const type = decoded.type;
                const isOnboarded = decoded.isOnboarded;
                const tenantId = decoded.tenantId;
                const isDesktopLocal = type === 'desktop-local';

                // 1. Identity/Admin Token handling (No specific tenant scoped yet)
                // If it's an admin with a tenantId, it's a Shadow Mode session and should be treated as Scoped.
                if (type === 'identity' || (type === 'admin' && !tenantId)) {
                    // Allow the onboarding page to render directly even with identity token
                    if (pathname === '/onboarding') {
                        setAuthorized(true);
                        return;
                    }
                    setNeedsTenantSelection(true);
                    setAuthorized(true);
                    return;
                }

                if (isDesktopLocal) {
                    if (isOnboarded === false && pathname !== '/onboarding') {
                        router.push("/onboarding");
                        return;
                    }

                    if (isOnboarded === true && pathname === '/onboarding') {
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
                    router.push("/login");
                    return;
                }

                // Onboarding Enforcement
                if (isOnboarded === false && pathname !== '/onboarding') {
                    router.push("/onboarding");
                    return;
                }

                // If onboarded, don't stay on onboarding page
                if (isOnboarded === true && pathname === '/onboarding') {
                    router.push("/dashboard");
                    return;
                }

                // Role-based route access
                if (!isRouteAllowed(pathname, role)) {
                    router.push("/dashboard");
                    return;
                }

                if (!cancelled) {
                    setAuthorized(true);
                }
            } catch {
                router.push("/login");
            }
        };

        void checkAuth();

        const handleStorageEvent = (e: StorageEvent) => {
            if (e.key === 'k_token' || e.key === 'k_user') {
                void checkAuth();
            }
        };
        window.addEventListener('storage', handleStorageEvent);

        return () => {
            cancelled = true;
            window.removeEventListener('session-expired', handleSessionExpired);
            window.removeEventListener('storage', handleStorageEvent);
        };
    }, [router, pathname]);

    if (!authorized) {
        return (
            <div className="flex bg-slate-50 h-screen w-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
                    <span className="text-slate-400 text-sm font-medium">Verifying access...</span>
                </div>
            </div>
        );
    }

    if (needsTenantSelection) {
        return <TenantSelector />;
    }

    return <>{children}</>;
}
