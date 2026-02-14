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

function getRoleFromToken(): string | null {
    try {
        const token = localStorage.getItem("token");
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

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const role = getRoleFromToken();
        if (!role) {
            router.push("/login");
            return;
        }

        // Check if user has access to the current route
        if (!isRouteAllowed(pathname, role)) {
            router.push("/dashboard");
            return;
        }

        setAuthorized(true);
    }, [router, pathname]);

    if (!authorized) {
        return <div className="flex bg-slate-50 h-screen w-screen items-center justify-center text-slate-400 text-sm font-medium">Verifying access...</div>;
    }

    return <>{children}</>;
}
