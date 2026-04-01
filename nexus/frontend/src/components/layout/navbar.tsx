"use client";

import { useEffect, useState } from "react";
import { UserMenu } from "@/components/layout/user-menu";
import { Search, Command, HardDrive } from "lucide-react";
import { MobileSidebar } from "./mobile-sidebar";
import { isDesktopOfflineMode } from "@/lib/desktop-offline";

export const Navbar = () => {
    const [offlineMode, setOfflineMode] = useState(false);

    useEffect(() => {
        setOfflineMode(isDesktopOfflineMode());
    }, []);

    return (
        <div className="flex items-center p-4 md:p-6 border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-[60]">
            <MobileSidebar />
            <div className="flex-1 flex items-center">
                <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer group shadow-sm" onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}>
                    <Search className="h-4 w-4 group-hover:text-blue-500 transition-colors" />
                    <span className="text-xs font-semibold tracking-tight">Search everything...</span>
                    <div className="flex items-center gap-1.5 ml-6 border-l border-slate-300 pl-4">
                        <Command className="h-3.5 w-3.5 text-slate-600" />
                        <span className="text-[10px] font-black tracking-tighter text-slate-600">K</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {offlineMode && (
                    <div 
                        onClick={async () => {
                            if ((window as any).nexusDesktop?.sync?.execute) {
                                try {
                                    const result = await (window as any).nexusDesktop.sync.execute();
                                    if (result.error) {
                                        alert("Sync failed: " + result.error);
                                    } else {
                                        alert(`Sync complete! Pushed: ${result.pushedCount}, Pulled: ${result.pulledCount}, Conflicts: ${result.conflictCount}`);
                                        if (result.pulledCount > 0) window.location.reload();
                                    }
                                } catch (e: any) {
                                    alert("Sync error: " + e.message);
                                }
                            }
                        }}
                        className="hidden lg:flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors"
                        title="Click to sync offline changes with the server"
                    >
                        <HardDrive className="h-3.5 w-3.5" />
                        <span>Local Workspace</span>
                        <span className="mx-1 opacity-50">|</span>
                        <span>Sync Now</span>
                    </div>
                )}
                <UserMenu />
            </div>
        </div>
    );
}
