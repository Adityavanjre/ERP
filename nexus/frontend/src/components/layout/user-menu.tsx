"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const UserMenu = () => {
    const router = useRouter();
    const [user, setUser] = useState<{ fullName: string } | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem("k_user");
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("k_token");
        localStorage.removeItem("k_user");
        router.push("/login");
    };

    return (
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-1.5 pl-4 rounded-2xl shadow-sm">
            <div className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-[200px]">
                    {user?.fullName || "Operator"}
                </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                <LogOut className="h-4 w-4" />
            </Button>
        </div>
    );
};
