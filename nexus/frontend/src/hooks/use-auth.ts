
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
        const token = localStorage.getItem("k_token");
        if (token) {
            try {
                const decoded = jwtDecode<User>(token);
                setUser(decoded);
            } catch (err) {
                console.error("Failed to decode token", err);
                localStorage.removeItem("k_token");
            }
        }
        setLoading(false);
    }, []);

    return { user, loading, isAuthenticated: !!user };
}
