import React from "react";
import { Barcode, Loader2 } from "lucide-react";

interface BarcodeSearchProps {
  search: string;
  setSearch: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSearching: boolean;
  lastScanFailed: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onAddProduct?: () => void;
}

export const BarcodeSearch: React.FC<BarcodeSearchProps> = ({
  search,
  setSearch,
  onSubmit,
  isSearching,
  lastScanFailed,
  inputRef,
  onAddProduct,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className={`flex items-center gap-3 px-4 py-2 transition-colors ${
        lastScanFailed ? "bg-rose-50" : "bg-slate-50"
      }`}
    >
      {/* Icon */}
      <div className={`shrink-0 ${lastScanFailed ? "text-rose-500" : "text-slate-400"}`}>
        {isSearching ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        ) : (
          <Barcode className="w-4 h-4" />
        )}
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Scan barcode or type SKU… (e.g. 2*SKU-01 for qty)"
        className={`flex-1 h-9 bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-300 outline-none border-none focus:ring-0 ${
          lastScanFailed ? "placeholder:text-rose-300" : ""
        }`}
      />

      {/* Inline Create Product Button */}
      {onAddProduct && (
        <button
          type="button"
          onClick={onAddProduct}
          className="shrink-0 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 transition-colors shadow-sm"
        >
          + Product
        </button>
      )}

      {/* Status badge */}
      <span
        className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
          lastScanFailed
            ? "bg-rose-100 text-rose-600"
            : isSearching
            ? "bg-blue-50 text-blue-600"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {lastScanFailed ? "Not Found" : isSearching ? "Searching..." : "Ready"}
      </span>
    </form>
  );
};
