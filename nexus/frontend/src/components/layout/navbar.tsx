"use client";

import { useEffect, useState } from "react";
import { UserMenu } from "@/components/layout/user-menu";
import { Search, Command, HardDrive } from "lucide-react";
import { MobileSidebar } from "./mobile-sidebar";
import { isDesktopOfflineMode } from "@/lib/desktop-offline";

export const Navbar = () => {
    const [offlineMode, setOfflineMode] = useState(false);
    const [isCloudAuthenticated, setIsCloudAuthenticated] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        setOfflineMode(isDesktopOfflineMode());
        const hasCloud = localStorage.getItem('k_cloud_sync_active') === '1';
        setIsCloudAuthenticated(hasCloud);
        
        // Listen for desktop sync events to show dynamic progress
        if ((window as any).nexusDesktop) {
            const checkSync = () => {
                // If it's a first-time cloud session and we haven't synced yet
                const syncCount = parseInt(localStorage.getItem('k_sync_count') || '0');
                if (hasCloud && syncCount === 0) setIsSyncing(true);
            };
            checkSync();
        }
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
                            if (!isCloudAuthenticated) {
                                window.location.href = "/portal/login?return_to=/portal/dashboard";
                                return;
                            }
                            if ((window as any).nexusDesktop?.sync?.execute) {
                                try {
                                    const result = await (window as any).nexusDesktop.sync.execute();
                                    if (result.error) {
                                        if (result.error.toLowerCase().includes("unauthorized") || result.error.toLowerCase().includes("token")) {
                                            alert("Cloud session expired. Please sign in again.");
                                            window.location.href = "/portal/login?return_to=/portal/dashboard";
                                        } else {
                                            alert("Sync failed: " + result.error);
                                        }
                                    } else {
                                        alert(`Sync complete! Pushed: ${result.pushedCount}, Pulled: ${result.pulledCount}, Conflicts: ${result.conflictCount}`);
                                        if (result.pulledCount > 0) window.location.reload();
                                    }
                                } catch (e: any) {
                                    alert("Sync error: " + e.message);
                                }
                            }
                        }}
                        className={`hidden lg:flex items-center gap-2 rounded-2xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${
                            isCloudAuthenticated 
                                ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" 
                                : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        }`}
                        title={isCloudAuthenticated ? "Click to sync offline changes with the server" : "Click to connect your local workspace to the cloud"}
                    >
                        <HardDrive className={`h-3.5 w-3.5 ${isSyncing ? "animate-pulse" : ""}`} />
                        <span>{isSyncing ? "Cloud:" : "Local Workspace"}</span>
                        <span className="mx-1 opacity-50">|</span>
                        <span>{isSyncing ? "Connecting..." : isCloudAuthenticated ? "Sync Now" : "Connect Cloud"}</span>
                    </div>
                )}
                <UserMenu />
            </div>
        </div>
    );
}
