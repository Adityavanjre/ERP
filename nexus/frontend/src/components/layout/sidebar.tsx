"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
    LayoutDashboard,
    Package,
    Settings,
    ShoppingCart,
    Users,
    Factory,
    Landmark,
    Briefcase,
    ShoppingBag,
    LayoutGrid,
    Zap,
    RefreshCw,
    Command,
    ShieldCheck,
    ArrowLeftRight,
    BarChart2,
    Receipt,
    Truck,
    Activity,
    Stethoscope,
    HeartPulse,
    Microscope,
    Calendar,
    ClipboardList,
    LucideIcon
} from 'lucide-react';
import { KlypsoLogo } from '../brand/logo';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// Role-based access matrix
// Owner = all, Manager = all except settings, others = scoped
type RoleName = 'Owner' | 'Manager' | 'Biller' | 'Storekeeper' | 'Accountant' | 'CA';

interface SidebarItem {
    label: string;
    href: string;
    icon: LucideIcon;
    allowedRoles: RoleName[];
}

interface BusinessStream {
    label: string;
    icon: LucideIcon;
    items: SidebarItem[];
}

// const ALL_ROLES: RoleName[] = ['Owner', 'Manager', 'Biller', 'Storekeeper', 'Accountant', 'CA'];
const SALES_ROLES: RoleName[] = ['Owner', 'Manager', 'Biller'];
const STOCK_ROLES: RoleName[] = ['Owner', 'Manager', 'Storekeeper'];
const FINANCE_ROLES: RoleName[] = ['Owner', 'Manager', 'Accountant', 'CA'];
const INVOICE_VIEWERS: RoleName[] = ['Owner', 'Manager', 'Biller', 'Accountant', 'CA'];

const businessStreams: BusinessStream[] = [
    {
        label: 'Sales',
        icon: ShoppingCart,
        items: [
            { label: 'Quick Sale', href: '/sales/rapid', icon: Zap, allowedRoles: SALES_ROLES },
            { label: 'CRM', href: '/crm', icon: Users, allowedRoles: SALES_ROLES },
            { label: 'Sales Orders', href: '/sales', icon: ShoppingBag, allowedRoles: INVOICE_VIEWERS },
            { label: 'Credit Notes', href: '/sales/credit-notes', icon: Receipt, allowedRoles: INVOICE_VIEWERS },
        ]
    },
    {
        label: 'Inventory & Purchasing',
        icon: Package,
        items: [
            { label: 'Products', href: '/inventory', icon: Package, allowedRoles: STOCK_ROLES },
            { label: 'Purchases', href: '/purchases', icon: ShoppingBag, allowedRoles: STOCK_ROLES },
            { label: 'Debit Notes', href: '/inventory/debit-notes', icon: Truck, allowedRoles: STOCK_ROLES },
            { label: 'Warehouses', href: '/inventory/warehouses', icon: LayoutGrid, allowedRoles: STOCK_ROLES },
            { label: 'Stock Movements', href: '/inventory/movements', icon: ArrowLeftRight, allowedRoles: STOCK_ROLES },
        ]
    },
    {
        label: 'Manufacturing',
        icon: Factory,
        items: [
            { label: 'Overview', href: '/manufacturing', icon: Factory, allowedRoles: STOCK_ROLES },
            { label: 'Bill of Materials', href: '/manufacturing/bom', icon: Command, allowedRoles: STOCK_ROLES },
            { label: 'Work Orders', href: '/manufacturing/orders', icon: ClipboardList, allowedRoles: STOCK_ROLES },
        ]
    },
    {
        label: 'Accounting',
        icon: Landmark,
        items: [
            { label: 'Accounts', href: '/accounting', icon: Landmark, allowedRoles: FINANCE_ROLES },
            { label: 'Auditor', href: '/accounting/auditor', icon: ShieldCheck, allowedRoles: FINANCE_ROLES },
            { label: 'Reports', href: '/accounting/reports', icon: BarChart2, allowedRoles: FINANCE_ROLES },
            { label: 'Fixed Assets', href: '/accounting/fixed-assets', icon: Briefcase, allowedRoles: FINANCE_ROLES },
        ]
    },
    {
        label: 'Healthcare',
        icon: Activity,
        items: [
            { label: 'Patients', href: '/healthcare', icon: Users, allowedRoles: SALES_ROLES },
            { label: 'Appointments', href: '/healthcare/appointments', icon: Calendar, allowedRoles: SALES_ROLES },
            { label: 'Medical Records', href: '/healthcare/records', icon: ClipboardList, allowedRoles: FINANCE_ROLES },
            { label: 'Pharmacy', href: '/healthcare/pharmacy', icon: Package, allowedRoles: STOCK_ROLES },
        ]
    },
    {
        label: 'NBFC Operations',
        icon: Landmark,
        items: [
            { label: 'Loan Portfolio', href: '/nbfc', icon: Landmark, allowedRoles: FINANCE_ROLES },
            { label: 'Collections', href: '/nbfc/collections', icon: Receipt, allowedRoles: SALES_ROLES },
            { label: 'KYC Registry', href: '/nbfc/kyc', icon: ShieldCheck, allowedRoles: SALES_ROLES },
        ]
    },
    {
        label: 'Logistics',
        icon: Truck,
        items: [
            { label: 'Fleet Management', href: '/logistics', icon: Truck, allowedRoles: STOCK_ROLES },
            { label: 'Consignments', href: '/logistics/consignments', icon: ShoppingBag, allowedRoles: SALES_ROLES },
        ]
    },
    {
        label: 'Construction',
        icon: LayoutGrid,
        items: [
            { label: 'Project Sites', href: '/construction', icon: LayoutGrid, allowedRoles: SALES_ROLES },
            { label: 'Task Console', href: '/projects', icon: ClipboardList, allowedRoles: SALES_ROLES },
            { label: 'Material at Site', href: '/inventory', icon: Package, allowedRoles: STOCK_ROLES },
            { label: 'Sub-contractors', href: '/construction/subs', icon: Users, allowedRoles: SALES_ROLES },
        ]
    },
    {
        label: 'Projects & Tasks',
        icon: ClipboardList,
        items: [
            { label: 'Project Console', href: '/projects', icon: LayoutDashboard, allowedRoles: SALES_ROLES },
        ]
    }
];

interface IndustryTerminology {
    customer?: string;
    product?: string;
    inventory?: string;
    department?: string;
    [key: string]: string | undefined;
}

export const Sidebar = ({ onItemClick }: { onItemClick?: () => void }) => {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const userRole = user?.isSuperAdmin ? 'Owner' : (user?.role as RoleName) || 'Biller';

    const [enabledModules, setEnabledModules] = useState<string[]>(['dashboard']);
    const [terminology, setTerminology] = useState<IndustryTerminology>({});

    const fetchConfig = useCallback(async () => {
        try {
            const token = localStorage.getItem('k_token');
            const identity = localStorage.getItem('k_identity');

            // SEC-011: Identity Isolation for Registration and Onboarding
            if (token && identity && token === identity) {
                setEnabledModules(['dashboard', 'onboarding']);
                return;
            }

            const res = await api.get('system/config');
            const config = res.data || {};
            setEnabledModules(config.enabledModules || []);
            setTerminology(config.terminology || {});
        } catch (err) {
            console.error("Critical: Failed to sync industry configuration", err);
            // Safety fallback: Limit visibility to basic operations on auth failure.
            setEnabledModules(['dashboard', 'sales', 'inventory', 'accounting', 'crm']);
        }
    }, []);

    // PERF-001: Navigation Pre-warming
    // Proactively pre-fetches module data on hover to hit 'Zero Latency' goal.
    const prewarmModule = useCallback((modulePath: string) => {
        // Only pre-warm specific heavy-weight dashboard routes if needed
        // The api cache handles the actual caching logic.
        if (modulePath.includes('/dashboard')) {
            api.get('system/stats').catch(() => { });
        }
        if (modulePath.includes('/admin/monitoring')) {
            api.get('system/founder-dashboard').catch(() => { });
        }
        if (modulePath.includes('/sales')) {
            api.get('analytics/summary').catch(() => { });
        }
        if (modulePath.includes('/accounting')) {
            api.get('analytics/performance').catch(() => { });
        }
        if (modulePath.includes('/inventory')) {
            api.get('system/stats').catch(() => { });
        }
        if (modulePath.includes('/crm')) {
            api.get('analytics/activity').catch(() => { });
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    // Filter streams: 
    // 1. Role-based filtering (already present)
    // 2. Industry-based filtering (new)
    const visibleStreams = businessStreams
        .map(stream => ({
            ...stream,
            items: stream.items
                .filter(item => {
                    // UI-GOV-001: SuperAdmin Role Bypass
                    // Super Admin can bypass role restrictions within enabled modules.
                    const roleAllowed = user?.isSuperAdmin || (item.allowedRoles as RoleName[]).includes(userRole);
                    if (!roleAllowed) return false;

                    // Check Industry/Module Status
                    const pathParts = item.href.split('/').filter(p => p !== '');
                    const moduleKey = pathParts[0];

                    if (moduleKey) {
                        // Core modules are platform-wide
                        if (moduleKey === 'crm' || moduleKey === 'dashboard' || moduleKey === 'settings') return true;

                        // Check if module is enabled for this industry
                        if (!enabledModules.includes(moduleKey)) return false;

                        return true;
                    }
                    return true;
                })
                .map(item => {
                    // Apply Dynamic Terminology
                    let translatedLabel = item.label;
                    if (item.label === 'CRM') translatedLabel = terminology.customer || 'CRM';
                    if (item.label === 'Products') translatedLabel = terminology.product || 'Products';

                    return { ...item, label: translatedLabel };
                })
        }))
        .filter(stream => stream.items.length > 0);

    const canAccessSettings = userRole === 'Owner';

    return (
        <div className="flex flex-col h-full bg-slate-50/50 border-r border-slate-100 text-slate-700">
            <div className="px-6 py-10 pb-4 shrink-0">
                <Link href="/dashboard" onClick={onItemClick} className="flex items-center transition-all hover:opacity-80">
                    <KlypsoLogo />
                </Link>
                {user?.isSuperAdmin && (
                    <div className="mt-4 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-amber-500" />
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em]">System Sovereign</span>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6 space-y-8 min-h-0">
                <div className="space-y-1 mb-6">
                    <Link
                        href="/dashboard"
                        onClick={onItemClick}
                        onMouseEnter={() => prewarmModule('/dashboard')}
                        className={cn(
                            "text-xs group flex p-4 w-full justify-start font-black cursor-pointer hover:bg-white rounded-2xl transition-all duration-300 uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98]",
                            pathname === '/dashboard' ? "bg-white text-blue-600 shadow-lg shadow-blue-500/5" : "text-slate-500"
                        )}
                    >
                        <div className="flex items-center flex-1">
                            <LayoutDashboard className={cn("h-4 w-4 mr-3 transition-all duration-300 group-hover:rotate-12", pathname === '/dashboard' ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500")} />
                            Dashboard
                        </div>
                    </Link>
                </div>

                {visibleStreams.map((stream) => (
                    <div key={stream.label} className="space-y-1">
                        <div className="text-[9px] font-black text-slate-400 mb-4 px-4 tracking-[0.25em] uppercase">
                            {stream.label}
                        </div>
                        {stream.items.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch={true}
                                    onClick={onItemClick}
                                    onMouseEnter={() => prewarmModule(item.href)}
                                    className={cn(
                                        "text-xs group flex p-4 w-full justify-start font-black cursor-pointer hover:bg-white rounded-2xl transition-all duration-300 uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98]",
                                        isActive ? "bg-white text-blue-600 shadow-lg shadow-blue-500/5" : "text-slate-500"
                                    )}
                                >
                                    <div className="flex items-center flex-1">
                                        <item.icon className={cn("h-4 w-4 mr-3 transition-all duration-500 group-hover:rotate-[20deg] group-hover:scale-125", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500")} />
                                        {item.label}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </div>

            <div className="shrink-0 p-6 pt-4 border-t border-slate-100 space-y-4">
                {user?.isSuperAdmin && (
                    <Link
                        href="/admin/monitoring"
                        onClick={onItemClick}
                        onMouseEnter={() => prewarmModule('/admin/monitoring')}
                        className={cn(
                            "text-xs group flex p-4 w-full justify-start font-black cursor-pointer hover:bg-white rounded-2xl transition-all duration-300 uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98]",
                            pathname === '/admin/monitoring' ? "bg-white text-blue-600 shadow-lg shadow-blue-500/5" : "text-amber-600"
                        )}
                    >
                        <div className="flex items-center flex-1">
                            <ShieldCheck className={cn("h-4 w-4 mr-3 transition-all duration-500 group-hover:scale-125", pathname === '/admin/monitoring' ? "text-blue-600" : "text-amber-500 group-hover:text-amber-600")} />
                            Admin Console
                        </div>
                    </Link>
                )}

                {canAccessSettings && (
                    <Link
                        href="/settings"
                        onClick={onItemClick}
                        onMouseEnter={() => prewarmModule('/settings')}
                        className={cn(
                            "text-xs group flex p-4 w-full justify-start font-black cursor-pointer hover:bg-white rounded-2xl transition-all duration-300 uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98]",
                            pathname === '/settings' ? "bg-white text-blue-600 shadow-lg shadow-blue-500/5" : "text-slate-500"
                        )}
                    >
                        <div className="flex items-center flex-1">
                            <Settings className={cn("h-4 w-4 mr-3 transition-all duration-500 group-hover:rotate-90 group-hover:scale-125", pathname === '/settings' ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500")} />
                            Settings
                        </div>
                    </Link>
                )}

                <button
                    onClick={() => {
                        const identityToken = localStorage.getItem("k_identity");
                        if (identityToken) {
                            localStorage.setItem("k_token", identityToken);
                            // Clear industry config from cache to prevent stale layout
                            setEnabledModules(['dashboard']);
                            router.push("/portal/dashboard");
                        } else {
                            toast.error("Identity session lost. Please log in again.");
                        }
                    }}
                    className="text-xs group flex p-4 w-full justify-start font-black cursor-pointer hover:bg-white rounded-2xl transition-all duration-300 uppercase tracking-widest text-slate-500 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <div className="flex items-center flex-1">
                        <RefreshCw className="h-4 w-4 mr-3 text-slate-400 group-hover:text-blue-500 transition-all duration-300 group-hover:rotate-180" />
                        Switch Workspace
                    </div>
                </button>

                <div className="p-5 rounded-[2rem] bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] text-slate-400 leading-relaxed font-bold uppercase tracking-tighter">
                            Auto-Sync
                        </p>
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </div>
                    <p className="text-[10px] text-slate-900 font-black uppercase tracking-widest">
                        Live Sync
                    </p>
                </div>
            </div>
        </div>
    );
};
