
"use client";

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
    Command
} from 'lucide-react';
import { KlypsoLogo } from '../brand/logo';
import { toast } from 'react-hot-toast';
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
        label: 'Sales & Revenue',
        icon: ShoppingCart,
        items: [
            { label: 'Unified POS', href: '/sales/rapid', icon: Zap, allowedRoles: SALES_ROLES },
            { label: 'Clients & CRM', href: '/crm', icon: Users, allowedRoles: SALES_ROLES },
            { label: 'Invoices', href: '/sales', icon: ShoppingBag, allowedRoles: INVOICE_VIEWERS },
        ]
    },
    {
        label: 'Procurement & Stock',
        icon: Package,
        items: [
            { label: 'Inventory (Products)', href: '/inventory', icon: Package, allowedRoles: STOCK_ROLES },
            { label: 'Strategic Partners', href: '/purchases', icon: ShoppingBag, allowedRoles: STOCK_ROLES },
            { label: 'Warehouses', href: '/inventory/warehouses', icon: LayoutGrid, allowedRoles: STOCK_ROLES },
        ]
    },
    {
        label: 'Manufacturing',
        icon: Factory,
        items: [
            { label: 'Production Overview', href: '/manufacturing', icon: Factory, allowedRoles: STOCK_ROLES },
            { label: 'Bill of Materials', href: '/manufacturing/bom', icon: Command, allowedRoles: STOCK_ROLES },
            { label: 'Production Orders', href: '/manufacturing/orders', icon: ClipboardList, allowedRoles: STOCK_ROLES },
        ]
    },
    {
        label: 'Finance & Audit',
        icon: Landmark,
        items: [
            { label: 'Account Ledger', href: '/accounting', icon: Landmark, allowedRoles: FINANCE_ROLES },
            { label: 'Journal Entries', href: '/accounting/journal', icon: ClipboardList, allowedRoles: FINANCE_ROLES },
            { label: 'Tax & Tally Export', href: '/accounting/export', icon: RefreshCw, allowedRoles: FINANCE_ROLES },
        ]
    }
];

export const Sidebar = () => {
    const pathname = usePathname();
    const { user } = useAuth();
    const userRole = (user?.role as RoleName) || 'Biller'; // Default to most restrictive

    // Filter streams: only show sections where the user has access to at least one item
    const visibleStreams = businessStreams
        .map(stream => ({
            ...stream,
            items: stream.items.filter(item => item.allowedRoles.includes(userRole))
        }))
        .filter(stream => stream.items.length > 0);

    const canAccessSettings = userRole === 'Owner';

    return (
        <div className="flex flex-col h-full bg-slate-50/50 border-r border-slate-100 text-slate-700">
            <div className="px-6 py-10 pb-4 shrink-0">
                <Link href="/dashboard" className="flex items-center transition-all hover:opacity-80">
                    <KlypsoLogo />
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6 space-y-8 min-h-0">
                <div className="space-y-1 mb-6">
                    <Link
                        href="/dashboard"
                        className={cn(
                            "text-xs group flex p-4 w-full justify-start font-black cursor-pointer hover:bg-white rounded-2xl transition-all duration-200 uppercase tracking-widest",
                            pathname === '/dashboard' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                        )}
                    >
                        <div className="flex items-center flex-1">
                            <LayoutDashboard className={cn("h-4 w-4 mr-3 transition-colors", pathname === '/dashboard' ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500")} />
                            Overview
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

                <div className="p-5 rounded-[2rem] bg-white border border-slate-100 shadow-sm">
                    <p className="text-[9px] text-slate-400 leading-relaxed font-bold uppercase tracking-tighter mb-4">
                        System Active
                    </p>
                    <button
                        onClick={() => {
                            toast.success('Initiating System Sync...');
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        }}
                        className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <RefreshCw className="h-3 w-3" /> Refresh Data
                    </button>
                </div>
            </div>
        </div>
    );
};
