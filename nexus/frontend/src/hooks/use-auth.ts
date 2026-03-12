
"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

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
        const checkToken = () => {
            const token = localStorage.getItem("k_token");
            if (token) {
                try {
                    const decoded = jwtDecode<User>(token);
                    const userData: User = {
                        ...decoded,
                        id: decoded.id || decoded.sub || '', // Fallback to 'sub' from JWT
                    };

                    // Prevent identity mismatch if token changed in another tab
                    if (!user || user.id !== userData.id || user.tenantId !== userData.tenantId) {
                        setUser(userData);
                    }
                } catch {
                    localStorage.removeItem("k_token");
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        };

        checkToken();

        // AUTH-002: Real-time synchronization of auth tokens across tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'k_token') {
                checkToken();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [user]);

    return { user, loading, isAuthenticated: !!user };
}
