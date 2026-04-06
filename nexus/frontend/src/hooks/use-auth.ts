
"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { hydrateDesktopOfflineSession } from "@/lib/desktop-offline";

export interface User {
    id: string;
    sub?: string;
    email: string;
    role: string;
    tenantId: string;
    tenantName?: string;
    industry?: string;
    type?: string;
    isSuperAdmin?: boolean;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const checkToken = async () => {
            await hydrateDesktopOfflineSession();
            const token = localStorage.getItem("k_token");
            if (token) {
                try {
                    const decoded = jwtDecode<User>(token);
                    const userData: User = {
                        ...decoded,
                        id: decoded.id || decoded.sub || '', // Fallback to 'sub' from JWT
                    };

                    // Prevent identity mismatch if token changed in another tab
                    if (!cancelled) {
                        setUser(prev => {
                            if (!prev || prev.id !== userData.id || prev.tenantId !== userData.tenantId) {
                                return userData;
                            }
                            return prev;
                        });
                    }
                } catch {
                    localStorage.removeItem("k_token");
                    if (!cancelled) {
                        setUser(null);
                    }
                }
            } else {
                if (!cancelled) {
                    setUser(null);
                }
            }
            if (!cancelled) {
                setLoading(false);
            }
        };

        void checkToken();

        // AUTH-002: Real-time synchronization of auth tokens across tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'k_token') {
                void checkToken();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            cancelled = true;
            window.removeEventListener('storage', handleStorageChange);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount. Storage event handles cross-tab sync.

    return { user, loading, isAuthenticated: !!user };
}
