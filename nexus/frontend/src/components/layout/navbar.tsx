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
                    <div className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
                        <div 
                            onClick={async () => {
                                const bridge = (window as unknown as { nexusDesktop?: { sync: { execute: () => Promise<{ error?: string; pushedCount: number; pulledCount: number; conflictCount: number }> } } }).nexusDesktop;
                                if (bridge?.sync?.execute) {
                                    try {
                                        const result = await bridge.sync.execute();
                                        if (result.error) {
                                            alert("Sync failed: " + result.error);
                                        } else {
                                            alert(`Sync complete! Pushed: ${result.pushedCount}, Pulled: ${result.pulledCount}, Conflicts: ${result.conflictCount}`);
                                            if (result.pulledCount > 0) window.location.reload();
                                        }
                                    } catch (err: unknown) {
                                        const error = err as { message?: string };
                                        alert("Sync error: " + (error.message || "Unknown error"));
                                    }
                                }
                            }}
                            className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors"
                            title="Incremental sync"
                        >
                            <HardDrive className="h-3.5 w-3.5" />
                            <span>Sync Now</span>
                        </div>
                        <div 
                            onClick={async () => {
                                if (!confirm("FULL RESTORE: This will pull all data from the cloud and overwrite local records. Recent offline changes may be merged or overwritten. Proceed?")) return;
                                const bridge = (window as unknown as { nexusDesktop?: { sync: { bootstrap: () => Promise<{ error?: string; pulledCount: number }> } } }).nexusDesktop;
                                if (bridge?.sync?.bootstrap) {
                                    try {
                                        const result = await bridge.sync.bootstrap();
                                        if (result.error) {
                                            alert("Restore failed: " + result.error);
                                        } else {
                                            alert(`Full Restore Successful! Pulled ${result.pulledCount} critical records.`);
                                            window.location.reload();
                                        }
                                    } catch (err: unknown) {
                                        const error = err as { message?: string };
                                        alert("Restore error: " + (error.message || "Unknown error"));
                                    }
                                }
                            }}
                            className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 cursor-pointer transition-colors"
                            title="Full cloud recovery"
                        >
                            <span>Restore</span>
                        </div>
                    </div>
                )}
                <UserMenu />
            </div>
        </div>
    );
}
