
"use client";

import { useEffect, useState } from "react";
import {
    Search,
    Zap,
    Calculator,
    Settings,
    Users,
    Package,
    Boxes,
    Terminal,
    Cpu,
    Activity,
    Landmark,
    LayoutGrid,
    BarChart3,
    Clock,
    FileText,
    ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchResults = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            setSearching(true);
            try {
                const res = await api.get(`/kernel/search?q=${query}`);
                setResults(res.data);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setSearching(false);
            }
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const commands = [
        { name: "Executive Dashboard", icon: LayoutGrid, path: "/dashboard", category: "Navigation" },
        { name: "Manufacturing Operations", icon: Boxes, path: "/manufacturing", category: "Navigation" },
        { name: "Inventory Management", icon: Package, path: "/inventory", category: "Navigation" },
        { name: "Financial Intelligence", icon: Landmark, path: "/accounting", category: "Navigation" },
        { name: "Customer Directory", icon: Users, path: "/crm", category: "Navigation" },
        { name: "App Marketplace", icon: Zap, path: "/apps", category: "System" },
        { name: "Organization Settings", icon: Settings, path: "/settings", category: "System" },
        { name: "Predictive Analytics (AI)", icon: Cpu, path: "/dashboard", category: "AI" },
        { name: "System Activity", icon: Activity, path: "/dashboard", category: "System" },
    ];

    const filteredCommands = query === ""
        ? commands
        : commands.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

    const runCommand = (path: string) => {
        router.push(path);
        setOpen(false);
        setQuery("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-2xl bg-white/95 border-slate-200 backdrop-blur-2xl p-0 overflow-hidden shadow-2xl shadow-blue-500/5 rounded-[2.5rem]">
                <DialogHeader className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <Terminal className="h-6 w-6 text-blue-600" />
                        <Input
                            autoFocus
                            placeholder="Type a command or search..."
                            className="bg-transparent border-none text-slate-900 focus-visible:ring-0 placeholder:text-slate-400 text-xl py-8 font-medium"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-slate-200 text-slate-400 px-2 font-black text-[10px]">ESC</Badge>
                        </div>
                    </div>
                </DialogHeader>

                <div className="max-h-[450px] overflow-y-auto p-4 space-y-6 pb-6">
                    {/* Search Results */}
                    {results.length > 0 && (
                        <div className="space-y-2">
                            <div className="px-3 py-2 text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                <Search className="h-3 w-3" /> Intelligence Matches
                            </div>
                            {results.map((res, i) => {
                                const Icon = res.type === 'Product' ? Package : res.type === 'Customer' ? Users : FileText;
                                return (
                                    <button
                                        key={`res-${i}`}
                                        onClick={() => runCommand(res.path)}
                                        className="w-full flex items-center justify-between p-4 rounded-[1.5rem] hover:bg-slate-50 transition-all group text-left border border-transparent hover:border-slate-100"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 transition-colors">
                                                <Icon className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="text-[15px] text-slate-900 font-bold">{res.title}</div>
                                                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{res.subtitle}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-[9px] text-slate-500 uppercase font-black">
                                            {res.type}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {filteredCommands.length > 0 ? (
                        <>
                            {["Navigation", "System", "AI"].map(cat => {
                                const catCommands = filteredCommands.filter(c => c.category === cat);
                                if (catCommands.length === 0) return null;

                                return (
                                    <div key={cat} className="space-y-2">
                                        <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cat}</div>
                                        {catCommands.map((command, i) => (
                                            <button
                                                key={i}
                                                onClick={() => runCommand(command.path)}
                                                className="w-full flex items-center justify-between p-4 rounded-[1.5rem] hover:bg-slate-50 transition-all group text-left border border-transparent hover:border-slate-100"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 group-hover:border-blue-500/50 transition-colors">
                                                        <command.icon className="h-5 w-5 text-slate-500 group-hover:text-blue-600" />
                                                    </div>
                                                    <span className="text-slate-700 group-hover:text-slate-900 font-bold">{command.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Execute</span>
                                                    <ArrowRight className="h-4 w-4 text-blue-600" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div className="p-16 text-center space-y-4">
                            <Search className="h-16 w-16 text-slate-100 mx-auto" />
                            <p className="text-slate-400 text-sm font-medium">No system protocols found for "{query}"</p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-slate-200 text-slate-400 px-2 py-0.5 font-black">↵</Badge>
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Select</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-slate-200 text-slate-400 px-2 py-0.5 font-black">↑↓</Badge>
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Navigate</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                        <span className="text-[9px] text-slate-400 uppercase tracking-[0.2em] font-black">Nexus OS v2.10</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
