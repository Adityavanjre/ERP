"use client";

import React from "react";
import { Info } from "lucide-react";

interface FieldInfoProps {
  content: string;
}

export function FieldInfo({ content }: FieldInfoProps) {
  return (
    <span className="relative group inline-flex items-center ml-1 select-none align-middle">
      <Info className="h-3 w-3 text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 font-medium normal-case tracking-normal text-center leading-relaxed">
        {content}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
  );
}
