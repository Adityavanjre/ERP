
"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import AuthGuard from "@/components/auth/auth-guard";
import { CommandPalette } from "@/components/layout/command-palette";
import { jwtDecode } from "jwt-decode";
import { Loader2 } from "lucide-react";
import { DraftRecovery } from "@/components/auth/draft-recovery";

interface DecodedToken {
    type?: string;
    [key: string]: string | number | boolean | undefined;
}

const DashboardLayout = ({
    children
}: {
    children: React.ReactNode;
}) => {
    const [isIdentityState, setIsIdentityState] = useState<boolean | null>(null);

    useEffect(() => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem("k_token") : null;
            if (token) {
                const decoded = jwtDecode<DecodedToken>(token);
                // Identification/Identity and Global Admin sessions without tenant context 
                // should render full-screen (selector, monitoring, onboarding).
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setIsIdentityState(decoded.type === 'identity' || (decoded.type === 'admin' && !decoded.tenantId));
            } else {
                setIsIdentityState(false);
            }
        } catch {
            setIsIdentityState(false);
        }
    }, []);

    // Prevent hydration flashes
    if (isIdentityState === null) {
        return (
            <div className="flex bg-slate-50 h-screen w-screen items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (isIdentityState) {
        return (
            <AuthGuard>
                {children}
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            <div className="h-screen bg-white text-slate-900 overflow-hidden relative">
                <CommandPalette />
                <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] border-r border-slate-100 bg-slate-50/50">
                    <Sidebar />
                </div>
                <div className="md:pl-72 h-full flex flex-col overflow-hidden">
                    <Navbar />
                    <DraftRecovery />
                    <main className="flex-1 overflow-y-auto scrollbar-hide">
                        <div className="max-w-[1700px] mx-auto min-h-full p-4 sm:p-6 md:p-8 lg:p-12">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}

export default DashboardLayout;
