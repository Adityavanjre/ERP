"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
    ClipboardList,
    LayoutGrid,
    Search,
    ChevronDown,
    Zap,
    Wand2,
    RefreshCw,
    Command,
    ShieldCheck,
    ArrowLeftRight,
    BarChart2,
    Receipt,
    Truck
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
    icon: any;
    allowedRoles: RoleName[];
}

interface BusinessStream {
    label: string;
    icon: any;
    items: SidebarItem[];
}

const ALL_ROLES: RoleName[] = ['Owner', 'Manager', 'Biller', 'Storekeeper', 'Accountant', 'CA'];
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
    }
];

export const Sidebar = ({ onItemClick }: { onItemClick?: () => void }) => {
    const pathname = usePathname();
    const { user } = useAuth();
    const userRole = (user?.role as RoleName) || 'Biller'; // Default to most restrictive

    const [enabledModules, setEnabledModules] = useState<string[]>([]);
    const [configLoading, setConfigLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const token = localStorage.getItem('k_token');
                const identity = localStorage.getItem('k_identity');

                // If the token is just the identity token, do not hit tenant-scoped APIs
                if (token && identity && token === identity) {
                    setEnabledModules(['sales', 'inventory', 'accounting']);
                    setConfigLoading(false);
                    return;
                }

                const res = await api.get('system/config');
                setEnabledModules(res.data.enabledModules || []);
            } catch (err) {
                console.error("Config fetch error:", err);
                // Fallback to sensible defaults if API fails
                setEnabledModules(['sales', 'inventory', 'accounting']);
            } finally {
                setConfigLoading(false);
            }
        };
        fetchConfig();
    }, []);

    // Filter streams: 
    // 1. Role-based filtering (already present)
    // 2. Industry-based filtering (new)
    const visibleStreams = businessStreams
        .map(stream => ({
            ...stream,
            items: stream.items.filter(item => {
                // Check Role
                const roleAllowed = item.allowedRoles.includes(userRole);
                if (!roleAllowed) return false;

                // Check Industry/Module enablement
                // Map href to module key
                const moduleKey = item.href.split('/')[1];
                if (moduleKey && enabledModules.length > 0) {
                    return enabledModules.includes(moduleKey);
                }
                return true;
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
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6 space-y-8 min-h-0">
                <div className="space-y-1 mb-6">
                    <Link
                        href="/dashboard"
                        onClick={onItemClick}
                        className={cn(
                            "text-xs group flex p-4 w-full justify-start font-black cursor-pointer hover:bg-white rounded-2xl transition-all duration-200 uppercase tracking-widest",
                            pathname === '/dashboard' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                        )}
                    >
                        <div className="flex items-center flex-1">
                            <LayoutDashboard className={cn("h-4 w-4 mr-3 transition-colors", pathname === '/dashboard' ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500")} />
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
                                    onClick={onItemClick}
                                    className={cn(
                                        "text-xs group flex p-4 w-full justify-start font-black cursor-pointer hover:bg-white rounded-2xl transition-all duration-200 uppercase tracking-widest",
                                        isActive ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                                    )}
                                >
                                    <div className="flex items-center flex-1">
                                        <item.icon className={cn("h-4 w-4 mr-3 transition-colors", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500")} />
                                        {item.label}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </div>

            <div className="shrink-0 p-6 pt-4 border-t border-slate-100 space-y-4">
                {canAccessSettings && (
                    <Link
                        href="/settings"
                        onClick={onItemClick}
                        className={cn(
                            "text-xs group flex p-4 w-full justify-start font-black cursor-pointer hover:bg-white rounded-2xl transition-all duration-200 uppercase tracking-widest",
                            pathname === '/settings' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                        )}
                    >
                        <div className="flex items-center flex-1">
                            <Settings className={cn("h-4 w-4 mr-3 transition-colors", pathname === '/settings' ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500")} />
                            Settings
                        </div>
                    </Link>
                )}

                <button
                    onClick={() => {
                        const identityToken = localStorage.getItem("k_identity");
                        if (identityToken) {
                            localStorage.setItem("k_token", identityToken);
                            window.location.href = "/dashboard";
                        } else {
                            toast.error("Identity session lost. Please log in again.");
                        }
                    }}
                    className="text-xs group flex p-4 w-full justify-start font-black cursor-pointer hover:bg-white rounded-2xl transition-all duration-200 uppercase tracking-widest text-slate-500"
                >
                    <div className="flex items-center flex-1">
                        <RefreshCw className="h-4 w-4 mr-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
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
