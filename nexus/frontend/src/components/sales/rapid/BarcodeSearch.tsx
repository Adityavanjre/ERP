import React from 'react';
import { Barcode } from 'lucide-react';

interface BarcodeSearchProps {
    search: string;
    setSearch: (val: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    isSearching: boolean;
    lastScanFailed: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

export const BarcodeSearch: React.FC<BarcodeSearchProps> = ({
    search,
    setSearch,
    onSubmit,
    isSearching,
    lastScanFailed,
    inputRef
}) => {
    return (
        <div className="p-6 pb-4 shrink-0">
            <form onSubmit={onSubmit} className="max-w-full mx-auto relative group">
                <input
                    ref={inputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Scan or enter code..."
                    className={`w-full bg-slate-50 border-4 ${lastScanFailed
                        ? 'border-rose-500 shadow-2xl shadow-rose-500/20 animate-shake'
                        : 'border-blue-100'
                        } group-focus-within:border-blue-600 group-focus-within:bg-white rounded-[24px] h-32 pl-8 pr-8 text-5xl font-black text-slate-900 placeholder:text-slate-200 outline-none transition-all shadow-inner focus:shadow-2xl focus:shadow-blue-500/10 tracking-tight`}
                />
                <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-4 pointer-events-none">
                    {isSearching ? (
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-xl">
                            <Barcode className="w-8 h-8 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanner Ready</span>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};
