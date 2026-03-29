"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, ArrowLeft } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl max-w-lg w-full">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          This section encountered an error. You can try again or go back to the
          dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl"
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/portal/dashboard")}
            className="rounded-xl"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
          </Button>
        </div>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-6 text-[10px] text-rose-600 text-left bg-rose-50 p-3 rounded-lg overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}
