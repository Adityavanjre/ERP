"use client";

import React from "react";
import { Info } from "lucide-react";

interface FieldInfoProps {
  message: string;
}

export function FieldInfo({ message }: FieldInfoProps) {
  return (
    <span className="relative inline-block ml-1.5 group select-none align-middle">
      <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-slate-100 text-xs normal-case font-semibold rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[999] pointer-events-none leading-relaxed">
        {message}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900" />
      </span>
    </span>
  );
}
