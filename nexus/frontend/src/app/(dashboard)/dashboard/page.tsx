
"use client";

import { useEffect, useState, useCallback } from "react";
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
    TrendingUp
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
    terminology: {
        customer?: string;
        product?: string;
    };
}

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useAuth();
    const userRole = (user?.role as RoleName) || 'Biller';
    interface SystemStats {
        apps: number;
        installed: number;
        records: number;
        uptime: string;
    }

    const [, setSystemStats] = useState<SystemStats>({
        apps: 0,
        installed: 0,
        records: 0,
        uptime: '99.9%'
    });

    const [biStats, setBiStats] = useState({
        revenue: 0,
        expenses: 0,
        profit: 0,
        orderCount: 0,
        customerCount: 0,
        inventoryCount: 0
    });

    const [healthStats, setHealthStats] = useState<HealthStats>({
        runRate: 0,
        burnRate: 0,
        growth: 0,
        healthScore: 100,
        alerts: []
    });

    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [activity, setActivity] = useState<ActivityLog[]>([]);
    const [valueChain, setValueChain] = useState<ValueChainStep[]>([]);
    const [loading, setLoading] = useState(true);

    const [enabledModules, setEnabledModules] = useState<string[]>([]);
    const [industryConfig, setIndustryConfig] = useState<IndustryConfig | null>(null);

    const fetchData = useCallback(async () => {
        try {
            // STEP 1: Urgent Bootstrapping (Unblock UI Shell)
            // We fetch the industry config first so we know what terminology and modules to show.
            const configRes = await api.get('system/config').catch(() => null);

            if (configRes?.data) {
                const cfgData = configRes.data;
                setIndustryConfig(cfgData);
                const apiModules: string[] = cfgData.enabledModules || [];
                const infrastructure = ['dashboard', 'crm', 'settings', 'apps', 'accounting'];
                setEnabledModules(Array.from(new Set([...infrastructure, ...apiModules])));
                // UNBLOCK: Show the dashboard shell immediately even if BI data is still in flight
                setLoading(false);
            }

            // STEP 2: Background BI Synchronization
            // These heavy calls run in parallel and populate their respective cards as they settle.
            const [systemRes, summaryRes, performanceRes, healthRes, activityRes, vcRes] = await Promise.allSettled([
                api.get('system/stats'),
                api.get('analytics/summary'),
                api.get('analytics/performance'),
                api.get('analytics/health'),
                api.get('analytics/activity'),
                api.get('analytics/value-chain')
            ]);

            const getVal = <T,>(res: PromiseSettledResult<{ data: T }>) =>
                res.status === 'fulfilled' ? res.value.data : null;

            const sysData = getVal<SystemStats>(systemRes as PromiseSettledResult<{ data: SystemStats }>);
            const sumData = getVal<Partial<typeof biStats>>(summaryRes as PromiseSettledResult<{ data: Partial<typeof biStats> }>);
            const perfData = getVal<ChartData[]>(performanceRes as PromiseSettledResult<{ data: ChartData[] }>);
            const healthData = getVal<HealthStats>(healthRes as PromiseSettledResult<{ data: HealthStats }>);
            const actData = getVal<ActivityLog[]>(activityRes as PromiseSettledResult<{ data: ActivityLog[] }>);
            const vcData = getVal<ValueChainStep[]>(vcRes as PromiseSettledResult<{ data: ValueChainStep[] }>);

            if (sysData) setSystemStats(sysData);
            if (sumData) setBiStats(prev => ({ ...prev, ...sumData }));
            if (perfData) setChartData(perfData);
            if (healthData) setHealthStats(healthData);
            if (actData) setActivity(actData);
            if (vcData) setValueChain(vcData);

        } catch (err) {
            console.error("Data update error:", err);
        } finally {
            // Final safety unblock if config failed but loop finished
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const syncInterval = setInterval(fetchData, 30000);
        return () => clearInterval(syncInterval);
    }, [fetchData]);

    const term = industryConfig?.terminology || {};

    const kpiCards = [
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
            title: term.customer || "Customers",
            value: biStats.customerCount,
            icon: Users,
            color: "text-sky-400",
            bg: "bg-sky-500/10",
            desc: `Total ${term.customer?.toLowerCase() || 'customers'}`
        },
        {
            title: term.product || "Products",
            value: biStats.inventoryCount,
            icon: Package,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            desc: `Active ${term.product?.toLowerCase() || 'products'}`
        }
    ];

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Synchronizing business intelligence...</div>;

    return (
        <div className="flex-1 space-y-6 md:space-y-8 pt-2 md:pt-6 px-4 md:px-8 w-full max-w-full overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-950 flex items-center">
                        <Cpu className="mr-4 h-9 w-9 text-blue-600 shadow-sm" />
                        {industryConfig?.industry ? `${industryConfig.industry} Console` : 'Klypso Dashboard'}
                    </h2>
                    <p className="text-slate-600 mt-2 font-medium">Live {industryConfig?.industry?.toLowerCase() || 'business'} intelligence and operational metrics.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black">System Status</p>
                        <p className="text-xs text-emerald-600 font-mono font-black">CONTINUOUS SYNC ACTIVE</p>
                    </div>
                    <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50/50 px-4 py-2 rounded-2xl shadow-sm">
                        <Activity className="h-3 w-3 mr-2 animate-pulse" /> Live Sync
                    </Badge>
                </div>
            </div>

            {/* Process Overview */}
            <div className="bg-white border border-slate-200 rounded-3xl p-1.5 shadow-xl shadow-slate-200/50">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {(valueChain || []).map((step, i) => (
                        <div key={i} className="relative group overflow-hidden p-6 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-white hover:border-blue-200 transition-all cursor-default">
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
                    { label: `Add ${term.product || "Product"}`, icon: Plus, color: "bg-blue-100 text-blue-600", href: "/inventory", roles: STOCK_ROLES },
                    { label: term.customer || "Customers", icon: Users, color: "bg-indigo-100 text-indigo-600", href: "/crm", roles: SALES_ROLES },
                    { label: "Purchases", icon: Truck, color: "bg-amber-100 text-amber-600", href: "/purchases", roles: STOCK_ROLES },
                    { label: "Accounting", icon: FileText, color: "bg-rose-100 text-rose-600", href: "/accounting", roles: FINANCE_ROLES },
                    { label: "Apps & Modules", icon: LayoutGrid, color: "bg-fuchsia-100 text-fuchsia-600", href: "/apps", roles: ['Owner', 'Manager'] as RoleName[] },
                ].filter(action => {
                    const roleAllowed = action.roles.includes(userRole);
                    if (!roleAllowed) return false;

                    const pathParts = action.href.split('/').filter(p => p !== '');
                    const moduleKey = pathParts[0];

                    if (moduleKey && enabledModules.length > 0) {
                        // CRM is a core platform service, usually mapped to the 'customer' terminology
                        if (moduleKey === 'crm') return true;
                        return enabledModules.includes(moduleKey);
                    }
                    return true;
                }).map((action, i) => (
                    <button
                        key={i}
                        onClick={() => router.push(action.href)}
                        onMouseEnter={() => {
                            const moduleKey = action.href.split('/')[1];
                            if (moduleKey === 'sales') api.get('analytics/summary').catch(() => { });
                            if (moduleKey === 'inventory') api.get('system/stats').catch(() => { });
                            if (moduleKey === 'accounting') api.get('analytics/performance').catch(() => { });
                        }}
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
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
                {(kpiCards || []).map((kpi, i) => (
                    <Card key={i} className="bg-white border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden rounded-[1.5rem] sm:rounded-3xl">
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
                                        dataKey="month"
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
                            {activity.length > 0 ? activity.map((log, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:bg-slate-50 transition-all cursor-default">
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
