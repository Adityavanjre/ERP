"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
          <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl max-w-md w-full">
            <AlertTriangle className="h-16 w-16 text-rose-500 mx-auto mb-6" />
            <h1 className="text-2xl font-black tracking-tighter mb-2 italic uppercase">System Exception</h1>
            <p className="text-zinc-400 text-sm mb-8">
              A critical UI error occurred. Our engineers have been notified.
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => window.location.reload()} 
                className="bg-white text-black hover:bg-zinc-200 font-bold rounded-2xl h-12"
              >
                <RefreshCcw className="mr-2 h-4 w-4" /> Hard Reload App
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => this.setState({ hasError: false })}
                className="text-zinc-500 hover:text-white"
              >
                Attempt Recovery
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-8 text-[10px] text-rose-400 text-left bg-black/50 p-4 rounded-xl overflow-auto max-h-40">
                {this.state.error?.message}
                {this.state.error?.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.children;
  }
}
