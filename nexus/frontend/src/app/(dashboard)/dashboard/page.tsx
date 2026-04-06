
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Cpu,
    Zap,
    Activity,
    LayoutGrid,
    DollarSign,
    Package,
    Users,
    ArrowDownRight,
    Clock,
    CreditCard,
    Plus,
    Truck,
    FileText,
    TrendingUp,
    Factory,
    ClipboardList,
    BarChart2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

type RoleName = 'Owner' | 'Manager' | 'Biller' | 'Storekeeper' | 'Accountant' | 'CA';

const SALES_ROLES: RoleName[] = ['Owner', 'Manager', 'Biller'];
const STOCK_ROLES: RoleName[] = ['Owner', 'Manager', 'Storekeeper'];
const FINANCE_ROLES: RoleName[] = ['Owner', 'Manager', 'Accountant', 'CA'];
const MANUFACTURING_ROLES: RoleName[] = ['Owner', 'Manager', 'Storekeeper'];

interface HealthStats {
    runRate: number;
    burnRate: number;
    growth: number;
    healthScore: number;
    alerts: string[];
}

interface ChartData {
    month: string;
    revenue: number;
}

interface ActivityLog {
    message: string;
    user: string;
    time: string | Date;
}

interface ValueChainStep {
    label: string;
    count: number;
    color: string;
}

interface IndustryConfig {
    industry: string;
    enabledModules: string[];
    terminology: Record<string, string>;
}

interface SystemStats {
    apps: number;
    installed: number;
    records: number;
    uptime: string;
}

type ApiResponse<T> = {
    data: T;
};

type SettledApiResult<T> = PromiseSettledResult<ApiResponse<T>>;

// ─────────────────────────────────────────────────────────────────────────────
// SESSION-LEVEL CACHE
// Prevents re-fetching all 7 analytics endpoints every time the user navigates
// back to the dashboard within the same browser session.
// Cache is invalidated after 5 minutes to keep data reasonably fresh.
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const EMPTY_BI_STATS = {
    revenue: 0,
    expenses: 0,
    profit: 0,
    orderCount: 0,
    customerCount: 0,
    inventoryCount: 0,
    activeCampaigns: 0,
    workOrderCount: 0,
};

interface DashboardCache {
    biStats: typeof EMPTY_BI_STATS;
    healthStats: HealthStats;
    chartData: ChartData[];
    activity: ActivityLog[];
    valueChain: ValueChainStep[];
    enabledModules: string[];
    industryConfig: IndustryConfig | null;
    fetchedAt: number;
}

let _dashboardCache: DashboardCache | null = null;

function getCachedDashboard(): DashboardCache | null {
    if (!_dashboardCache) return null;
    if (Date.now() - _dashboardCache.fetchedAt > CACHE_TTL_MS) {
        _dashboardCache = null;
        return null;
    }
    return _dashboardCache;
}

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useAuth();
    const userRole = (user?.role as RoleName) || 'Biller';

    const cache = getCachedDashboard();

    const [, setSystemStats] = useState<SystemStats>({
        apps: 0,
        installed: 0,
        records: 0,
        uptime: '99.9%'
    });

    const [biStats, setBiStats] = useState(cache?.biStats ?? EMPTY_BI_STATS);
    const [healthStats, setHealthStats] = useState<HealthStats>(cache?.healthStats ?? {
        runRate: 0,
        burnRate: 0,
        growth: 0,
        healthScore: 100,
        alerts: []
    });
    const [chartData, setChartData] = useState<ChartData[]>(cache?.chartData ?? []);
    const [activity, setActivity] = useState<ActivityLog[]>(cache?.activity ?? []);
    const [valueChain, setValueChain] = useState<ValueChainStep[]>(cache?.valueChain ?? []);
    const [loading, setLoading] = useState(!cache); // Skip loading spinner if cache hit
    const [syncDegraded, setSyncDegraded] = useState(false);
    const [enabledModules, setEnabledModules] = useState<string[]>(cache?.enabledModules ?? []);
    const [industryConfig, setIndustryConfig] = useState<IndustryConfig | null>(cache?.industryConfig ?? null);

    const fetchData = useCallback(async (isInitial = false) => {
        // DEADLINE TIMER: If initial load, force-unblock the loading spinner after 2s
        let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
        if (isInitial) {
            deadlineTimer = setTimeout(() => setLoading(false), 2000);
        }

        try {
            console.log("DASHBOARD: Starting Immediate Manual Fetch...");

            // WAVE 1: VITALS (Lowest latency, highest priority)
            const vitalsPromise = api.get('analytics/summary').then(res => {
                setBiStats(prev => ({ ...prev, ...res.data }));
            }).catch(e => console.error("Vitals Fail:", e));

            await vitalsPromise; // Ensure vitals are in-flight or done before next wave

            // WAVE 2: CONFIG & INFRA
            const infraPromise = Promise.allSettled([
                api.get('system/config'),
                api.get('system/stats')
            ]).then(results => {
                const cfg = results[0].status === 'fulfilled' ? results[0].value.data : null;
                const sys = results[1].status === 'fulfilled' ? results[1].value.data : null;

                if (cfg) {
                    setIndustryConfig(cfg);
                    const infrastructure = ['dashboard', 'crm', 'settings', 'apps', 'accounting'];
                    setEnabledModules(Array.from(new Set([...infrastructure, ...cfg.enabledModules])));
                }
                if (sys) setSystemStats(sys);
            });

            await infraPromise;

            // WAVE 3: HEAVY ANALYTICS
            const analyticsPromise = Promise.allSettled([
                api.get('analytics/performance'),
                api.get('analytics/health'),
                api.get('analytics/activity'),
                api.get('analytics/value-chain')
            ]).then(results => {
                const getVal = <T,>(result: SettledApiResult<T>): T | null =>
                    result.status === 'fulfilled' ? result.value.data : null;

                const perf = getVal(results[0]);
                const hlth = getVal(results[1]);
                const act = getVal(results[2]);
                const vc = getVal(results[3]);

                if (perf) setChartData(perf);
                if (hlth) setHealthStats(hlth);
                if (act) setActivity(act);
                if (vc) setValueChain(vc);

                setSyncDegraded(!perf && !hlth);

                // Persist to session cache so back-navigation is instant
                _dashboardCache = {
                    biStats: biStats,
                    healthStats: hlth ?? healthStats,
                    chartData: perf ?? chartData,
                    activity: act ?? activity,
                    valueChain: vc ?? valueChain,
                    enabledModules: enabledModules,
                    industryConfig: industryConfig,
                    fetchedAt: Date.now(),
                };
            });

            await analyticsPromise;

        } catch (err) {
            console.error("DASHBOARD: Critical Sync Failure", err);
            setSyncDegraded(true);
        } finally {
            if (deadlineTimer) clearTimeout(deadlineTimer);
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // Only fetch from server if cache is empty or expired
        if (getCachedDashboard()) {
            console.log("DASHBOARD: Cache hit — skipping network requests.");
            return;
        }
        fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const term = useMemo<Record<string, string>>(
        () => industryConfig?.terminology ?? {},
        [industryConfig]
    );

    const kpiCards = useMemo(() => {
        const cards = [
            {
                title: "Gross Revenue",
                value: `₹${biStats.revenue.toLocaleString('en-IN')}`,
                icon: DollarSign,
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
                desc: "Total sales income"
            },
            {
                title: "Total Purchases",
                value: `₹${biStats.expenses.toLocaleString('en-IN')}`,
                icon: ArrowDownRight,
                color: "text-rose-500",
                bg: "bg-rose-500/10",
                desc: "Total purchase cost"
            },
            {
                title: term.Customer || "Customers",
                value: biStats.customerCount,
                icon: Users,
                color: "text-sky-400",
                bg: "bg-sky-500/10",
                desc: `Total ${term.Customer?.toLowerCase() || 'customers'}`
            },
            {
                title: term.Product || "Products",
                value: biStats.inventoryCount,
                icon: Package,
                color: "text-amber-500",
                bg: "bg-amber-500/10",
                desc: `Active ${term.Product?.toLowerCase() || 'products'}`
            }
        ];

        if (enabledModules.includes('manufacturing')) {
            cards.push({
                title: term.WorkOrder || "Work Orders",
                value: biStats.workOrderCount,
                icon: ClipboardList,
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
                desc: "Active production jobs",
            });
            cards.push({
                title: "Machine Uptime",
                value: "94.2%",
                icon: Cpu,
                color: "text-blue-500",
                bg: "bg-blue-500/10",
                desc: "Average operational time",
            });
            cards.push({
                title: "Production Yield",
                value: "98.1%",
                icon: BarChart2,
                color: "text-indigo-500",
                bg: "bg-indigo-500/10",
                desc: "Output vs Target efficiency",
            });
            cards.push({
                title: "Open Shortages",
                value: "12",
                icon: Activity,
                color: "text-rose-500",
                bg: "bg-rose-500/10",
                desc: "Stockouts affecting production",
            });
        }
        return cards;
    }, [biStats, enabledModules, term]);

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Synchronizing business intelligence...</div>;

    return (
        <div className="flex-1 space-y-6 md:space-y-8 pt-2 md:pt-6 px-4 md:px-8 w-full max-w-full overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-950 flex items-center">
                        <Cpu className="mr-4 h-9 w-9 text-blue-600 shadow-sm" />
                        {user?.tenantName || (industryConfig?.industry ? `${industryConfig.industry} Console` : 'Klypso Dashboard')}
                    </h2>
                    <p className="text-slate-600 mt-2 font-medium">Business intelligence and operational metrics for {user?.tenantName || 'your business'}.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black">System Status</p>
                        <p className={`text-xs font-mono font-black ${syncDegraded ? 'text-amber-500' : 'text-emerald-600'}`}>
                            {syncDegraded ? 'SYNC DEGRADED' : 'LIVE DATA'}
                        </p>
                    </div>
                    <Badge variant="outline" className={`px-4 py-2 rounded-2xl shadow-sm ${syncDegraded ? 'border-amber-200 text-amber-600 bg-amber-50/50' : 'border-blue-200 text-blue-600 bg-blue-50/50'}`}>
                        <Activity className="h-3 w-3 mr-2 animate-pulse" /> {syncDegraded ? 'Degraded' : 'Live Data'}
                    </Badge>
                </div>
            </div>

            {/* Process Overview */}
            <div className="bg-white border border-slate-200 rounded-3xl p-1.5 shadow-xl shadow-slate-200/50">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {(valueChain || []).map((step) => (
                        <div key={step.label} className="relative group overflow-hidden p-6 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-white hover:border-blue-200 transition-all cursor-default">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{step.label}</span>
                                <div className={cn(
                                    "h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]",
                                    step.color === 'sky' && "bg-sky-500 text-sky-500",
                                    step.color === 'amber' && "bg-amber-500 text-amber-500",
                                    step.color === 'indigo' && "bg-indigo-500 text-indigo-500",
                                    step.color === 'emerald' && "bg-emerald-500 text-emerald-500"
                                )} />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black font-mono text-slate-900 tracking-tighter">{step.count.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-600 font-black uppercase tracking-tight">Status</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
                {[
                    { label: "Quick Invoice", icon: CreditCard, color: "bg-emerald-100 text-emerald-600", href: "/sales/rapid", roles: SALES_ROLES },
                    { label: `Add ${term.Product || "Product"}`, icon: Plus, color: "bg-blue-100 text-blue-600", href: "/inventory", roles: STOCK_ROLES },
                    { label: term.Customer || "Customers", icon: Users, color: "bg-indigo-100 text-indigo-600", href: "/crm", roles: SALES_ROLES },
                    { label: "Purchases", icon: Truck, color: "bg-amber-100 text-amber-600", href: "/purchases", roles: STOCK_ROLES },
                    { label: term.WorkOrder || "Production", icon: Factory, color: "bg-emerald-100 text-emerald-600", href: "/manufacturing", roles: MANUFACTURING_ROLES },
                    { label: "Accounting", icon: FileText, color: "bg-rose-100 text-rose-600", href: "/accounting", roles: FINANCE_ROLES },
                    { label: "Apps & Modules", icon: LayoutGrid, color: "bg-fuchsia-100 text-fuchsia-600", href: "/apps", roles: ['Owner', 'Manager'] as RoleName[] },
                ].filter(action => {
                    const roleAllowed = action.roles.includes(userRole);
                    if (!roleAllowed) return false;

                    const pathParts = action.href.split('/').filter(p => p !== '');
                    const moduleKey = pathParts[0];

                        if (moduleKey && enabledModules.length > 0) {
                            if (moduleKey === 'crm') return true;
                            return enabledModules.includes(moduleKey);
                        }
                        return true;
                    }).map((action) => (
                        <button
                            key={action.label}
                            onClick={() => router.push(action.href)}
                            className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-[1.5rem] sm:rounded-3xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all group scale-100 active:scale-95"
                        >
                        <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 ${action.color} group-hover:scale-110 transition-transform shadow-sm`}>
                            <action.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-black text-slate-600 uppercase tracking-widest text-center">{action.label}</span>
                    </button>
                ))}
            </div>

            {/* Top Level KPIs */}
            <div className={cn(
                "grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4",
                kpiCards.length > 4 && "lg:grid-cols-5"
            )}>
                {(kpiCards || []).map((kpi) => (
                    <Card key={kpi.title} className="bg-white border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden rounded-[1.5rem] sm:rounded-3xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{kpi.title}</CardTitle>
                            <div className={`p-2.5 rounded-2xl ${kpi.bg}`}>
                                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-slate-900 tracking-tighter">{kpi.value}</div>
                            <p className="text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-tight">{kpi.desc}</p>
                        </CardContent>
                        <div className="h-1.5 w-full bg-slate-50" />
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Big Chart */}
                <Card className="col-span-4 bg-white border-slate-200 shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden relative border-none">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-6">
                        <CardTitle className="text-slate-900 flex items-center gap-3 text-xl font-black">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            Revenue This Year
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-medium">Monthly sales revenue across all orders.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#475569', fontSize: 10, fontWeight: '700' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#475569', fontSize: 10, fontWeight: '700' }}
                                        tickFormatter={(val) => `₹${val / 1000}k`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '16px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                        }}
                                        itemStyle={{ color: '#2563eb' }}
                                    />
                                    <Bar dataKey="revenue" radius={[10, 10, 0, 0]}>
                                        {(chartData || []).map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#2563eb' : '#e2e8f0'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* System Activity */}
                <div className="col-span-3 space-y-6">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-6">
                            <CardTitle className="text-slate-950 text-base flex items-center uppercase tracking-widest font-black">
                                <Zap className="mr-3 h-5 w-5 text-amber-500 shadow-sm" />
                                Business Growth
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="flex items-center justify-between p-6 rounded-3xl border border-blue-100 bg-blue-50/20">
                                <div>
                                    <p className="text-[10px] text-slate-600 font-black uppercase mb-1 tracking-widest">Health Score</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-5xl font-black text-slate-900">{healthStats.healthScore}</p>
                                        <span className="text-sm text-emerald-600 font-bold">/ 100</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-600 font-black uppercase mb-1 tracking-widest">Projected Growth</p>
                                    <p className="text-2xl font-black text-emerald-600">+{healthStats.growth}%</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
                                    <p className="text-[10px] text-slate-600 font-black uppercase mb-1 tracking-widest">Monthly MRR</p>
                                    <p className="text-xl font-black text-slate-800 tracking-tight">₹{healthStats.runRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                                </div>
                                <div className="p-4 rounded-2xl border border-rose-50 bg-rose-50/30">
                                    <p className="text-[10px] text-slate-600 font-black uppercase mb-1 tracking-widest">Monthly Burn</p>
                                    <p className="text-xl font-black text-rose-600 tracking-tight">₹{healthStats.burnRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                                </div>
                            </div>

                            {healthStats.alerts && healthStats.alerts.length > 0 && healthStats.alerts.map((alert: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-amber-500/80 px-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    {alert}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-6">
                            <CardTitle className="text-slate-950 text-base flex items-center uppercase tracking-widest font-black">
                                <Activity className="mr-3 h-5 w-5 text-blue-500 shadow-sm" />
                                Recent Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            {activity.length > 0 ? activity.map((log) => (
                                <div key={`${log.time}-${log.user}`} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:bg-slate-50 transition-all cursor-default">
                                    <div className="space-y-1 max-w-[70%]">
                                        <p className="text-[11px] font-black text-slate-900 tracking-tight leading-normal">{log.message}</p>
                                        <div className="flex items-center text-[10px] text-slate-600 font-bold uppercase tracking-tight">
                                            <span className="text-blue-600 mr-2 font-black">@{log.user}</span>
                                            <Clock className="h-2.5 w-2.5 mr-1" />
                                            {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] h-6 border-slate-200 text-slate-500 uppercase font-black px-3 rounded-xl bg-slate-50">
                                        Verified
                                    </Badge>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-zinc-600 text-xs italic">
                                    No recent business activity recorded.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
