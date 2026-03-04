"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AlertCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const DraftRecovery = () => {
    const [draft, setDraft] = useState<any>(null);
    const [isReplaying, setIsReplaying] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("k_draft_recovery");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Only show if the draft is less than 24 hours old
                if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                    setDraft(parsed);
                } else {
                    localStorage.removeItem("k_draft_recovery");
                }
            } catch (e) {
                localStorage.removeItem("k_draft_recovery");
            }
        }
    }, []);

    const handleReplay = async () => {
        if (!draft) return;
        setIsReplaying(true);
        try {
            await api({
                url: draft.url,
                method: draft.method,
                data: draft.data
            });
            toast.success("Work recovered and synchronized successfully!");
            localStorage.removeItem("k_draft_recovery");
            setDraft(null);
        } catch (error: any) {
            toast.error(`Sync failed: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsReplaying(false);
        }
    };

    const handleDismiss = () => {
        localStorage.removeItem("k_draft_recovery");
        setDraft(null);
    };

    if (!draft) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm bg-white border border-amber-200 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />

            <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-50 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">Unsaved Data Found</h4>
                        <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        A failed {draft.method.toUpperCase()} request to <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">{draft.url.split('/').pop()}</span> was captured from your last session.
                    </p>

                    <div className="flex items-center gap-2 mt-4">
                        <Button
                            size="sm"
                            onClick={handleReplay}
                            disabled={isReplaying}
                            className="bg-amber-600 hover:bg-amber-700 text-white border-0 h-8 text-[11px] px-4 rounded-full font-bold shadow-lg shadow-amber-200"
                        >
                            {isReplaying ? "Syncing..." : "Replay & Sync"}
                            {!isReplaying && <RotateCcw className="w-3 h-3 ml-2" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDismiss}
                            className="text-slate-400 hover:text-slate-600 hover:bg-transparent h-8 text-[11px] px-2"
                        >
                            Discard
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
