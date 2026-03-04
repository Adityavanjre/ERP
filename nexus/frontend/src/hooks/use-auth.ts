
"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

interface User {
    id: string;
    email: string;
    role: string;
    tenantId: string;
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
                    // Prevent identity mismatch if token changed in another tab
                    if (!user || user.id !== decoded.id || user.tenantId !== decoded.tenantId) {
                        setUser(decoded);
                    }
                } catch (err) {
                    console.error("Failed to decode token", err);
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
