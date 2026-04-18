"use client";

import { Button } from "../../../components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function SalesError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
      <div className="bg-violet-50 border border-violet-200 p-6 rounded-2xl max-w-md w-full">
        <AlertTriangle className="h-10 w-10 text-violet-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          Sales Module Error
        </h3>
        <p className="text-slate-500 text-sm mb-4">
          Failed to load sales data. Orders are unaffected.
        </p>
        <Button
          onClick={reset}
          className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl"
        >
          <RefreshCcw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    </div>
  );
}
