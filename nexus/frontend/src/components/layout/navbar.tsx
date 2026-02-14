"use client";

import { UserMenu } from "@/components/layout/user-menu";
import { Search, Command } from "lucide-react";

export const Navbar = () => {
    return (
        <div className="flex items-center p-6 border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-[60]">
            <div className="flex-1 flex items-center">
                <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer group shadow-sm" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>
                    <Search className="h-4 w-4 group-hover:text-blue-500 transition-colors" />
                    <span className="text-xs font-semibold tracking-tight">Global Explorer...</span>
                    <div className="flex items-center gap-1.5 ml-6 border-l border-slate-300 pl-4">
                        <Command className="h-3.5 w-3.5 text-slate-600" />
                        <span className="text-[10px] font-black tracking-tighter text-slate-600">K</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <UserMenu />
            </div>
        </div>
    );
}
