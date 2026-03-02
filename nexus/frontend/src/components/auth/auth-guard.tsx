"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { jwtDecode } from "jwt-decode";

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

function getRoleFromToken(): string | null {
    try {
        const token = localStorage.getItem("k_token");
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        return decoded.role || null;
    } catch {
        return null;
    }
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
        const handleSessionExpired = () => {
            console.log("[AuthGuard] Event 'session-expired' received, redirecting to /login");
            setAuthorized(false);
            router.push("/login");
        };

        window.addEventListener('session-expired', handleSessionExpired);

        const checkAuth = () => {
            const token = localStorage.getItem("k_token");
            console.log("[AuthGuard] checkAuth initiated. Token exists?", !!token);
            if (!token) {
                console.log("[AuthGuard] No token found in localStorage, redirecting to /login");
                router.push("/login");
                return;
            }

            try {
                const decoded: any = jwtDecode(token);
                const role = decoded.role;
                const type = decoded.type;
                const isOnboarded = decoded.isOnboarded;

                // 1. Identity Token handling (No tenant selected yet)
                if (type === 'identity') {
                    // Allow the onboarding page to render directly even with identity token
                    if (pathname === '/onboarding') {
                        setAuthorized(true);
                        return;
                    }
                    setNeedsTenantSelection(true);
                    setAuthorized(true);
                    return;
                }

                // 2. Tenant Scoped handling
                if (!role) {
                    console.log("[AuthGuard] Token decoded but no role found. Redirecting to /login. Decoded payload:", decoded);
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

                setAuthorized(true);
            } catch (err) {
                console.error("[AuthGuard] Auth check failed or token invalid", err);
                router.push("/login");
            }
        };

        checkAuth();

        return () => {
            window.removeEventListener('session-expired', handleSessionExpired);
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
