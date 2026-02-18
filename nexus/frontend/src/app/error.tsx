'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function RootError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log fatal error to forensic service if available
        console.error('CRITICAL_SYSTEM_ERROR:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-red-100 rounded-full blur-2xl animate-pulse"></div>
                    <AlertCircle className="w-20 h-20 text-red-600 relative z-10 mx-auto" />
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">
                        Integrity Interruption
                    </h1>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Nexus has encountered a high-entropy event. Our failsafe systems have isolated the error to prevent data leakage.
                    </p>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Error Digest</p>
                        <code className="text-xs font-mono text-red-800 break-all">
                            {error.digest || error.message || 'NX_SYSTEM_DRIFT_DETECTED'}
                        </code>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => reset()}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Resume System
                    </button>
                    <Link
                        href="/dashboard"
                        className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                        <Home className="w-4 h-4 text-blue-600" />
                        Return to Dashboard
                    </Link>
                </div>

                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                    Nexus Forensic Protection v2.1
                </p>
            </div>
        </div>
    );
}
