"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../hooks/use-auth";
import { useUX } from "../providers/ux-provider";
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
  Calendar,
  ClipboardList,
  Cpu,
  Layers,
  LucideIcon,
} from "lucide-react";
import { KlypsoLogo } from "../brand/logo";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";

// Role-based access matrix
// Owner = all, Manager = all except settings, others = scoped
type RoleName =
  | "Owner"
  | "Manager"
  | "Biller"
  | "Storekeeper"
  | "Accountant"
  | "CA";

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
  requiredModule?: string;
}

// const ALL_ROLES: RoleName[] = ['Owner', 'Manager', 'Biller', 'Storekeeper', 'Accountant', 'CA'];
const SALES_ROLES: RoleName[] = ["Owner", "Manager", "Biller"];
const STOCK_ROLES: RoleName[] = [
  "Owner",
  "Manager",
  "Storekeeper",
  "Accountant",
];
const FINANCE_ROLES: RoleName[] = ["Owner", "Manager", "Accountant", "CA"];
const INVOICE_VIEWERS: RoleName[] = [
  "Owner",
  "Manager",
  "Biller",
  "Accountant",
  "CA",
];

const businessStreams: BusinessStream[] = [
  {
    label: "Sales",
    icon: ShoppingCart,
    requiredModule: "sales",
    items: [
      {
        label: "Quick Sale",
        href: "/sales/rapid",
        icon: Zap,
        allowedRoles: SALES_ROLES,
      },
      { label: "CRM", href: "/crm", icon: Users, allowedRoles: SALES_ROLES },
      {
        label: "Sales Orders",
        href: "/sales",
        icon: ShoppingBag,
        allowedRoles: INVOICE_VIEWERS,
      },
      {
        label: "Credit Notes",
        href: "/sales/credit-notes",
        icon: Receipt,
        allowedRoles: INVOICE_VIEWERS,
      },
    ],
  },
  {
    label: "Inventory & Purchasing",
    icon: Package,
    requiredModule: "inventory",
    items: [
      {
        label: "Products",
        href: "/inventory",
        icon: Package,
        allowedRoles: STOCK_ROLES,
      },
      {
        label: "Purchases",
        href: "/purchases",
        icon: ShoppingBag,
        allowedRoles: STOCK_ROLES,
      },
      {
        label: "Debit Notes",
        href: "/inventory/debit-notes",
        icon: Truck,
        allowedRoles: STOCK_ROLES,
      },
      {
        label: "Warehouses",
        href: "/inventory/warehouses",
        icon: LayoutGrid,
        allowedRoles: STOCK_ROLES,
      },
      {
        label: "Stock Movements",
        href: "/inventory/movements",
        icon: ArrowLeftRight,
        allowedRoles: STOCK_ROLES,
      },
    ],
  },
  {
    label: "Manufacturing",
    icon: Factory,
    requiredModule: "manufacturing",
    items: [
      {
        label: "Overview",
        href: "/manufacturing",
        icon: Factory,
        allowedRoles: STOCK_ROLES,
      },
      {
        label: "Work Orders",
        href: "/manufacturing/orders",
        icon: ClipboardList,
        allowedRoles: STOCK_ROLES,
      },
      {
        label: "Bill of Materials",
        href: "/manufacturing/bom",
        icon: Command,
        allowedRoles: STOCK_ROLES,
      },
      {
        label: "Production Intelligence",
        href: "/manufacturing/intelligence",
        icon: BarChart2,
        allowedRoles: STOCK_ROLES,
      },
      {
        label: "Machine Registry",
        href: "/manufacturing/machines",
        icon: Cpu,
        allowedRoles: STOCK_ROLES,
      },
      {
        label: "Shortage Monitor",
        href: "/manufacturing/shortages",
        icon: Activity,
        allowedRoles: STOCK_ROLES,
      },
      {
        label: "Maintenance Hub",
        href: "/manufacturing/maintenance",
        icon: Settings,
        allowedRoles: STOCK_ROLES,
      },
    ],
  },
  {
    label: "Accounting",
    icon: Landmark,
    requiredModule: "accounting",
    items: [
      {
        label: "Accounts",
        href: "/accounting",
        icon: Landmark,
        allowedRoles: FINANCE_ROLES,
      },
      {
        label: "Auditor",
        href: "/accounting/auditor",
        icon: ShieldCheck,
        allowedRoles: FINANCE_ROLES,
      },
      {
        label: "Reports",
        href: "/accounting/reports",
        icon: BarChart2,
        allowedRoles: FINANCE_ROLES,
      },
      {
        label: "Fixed Assets",
        href: "/accounting/fixed-assets",
        icon: Briefcase,
        allowedRoles: FINANCE_ROLES,
      },
    ],
  },
  {
    label: "Healthcare",
    icon: Activity,
    requiredModule: "healthcare",
    items: [
      {
        label: "Patients",
        href: "/healthcare",
        icon: Users,
        allowedRoles: SALES_ROLES,
      },
      {
        label: "Appointments",
        href: "/healthcare/appointments",
        icon: Calendar,
        allowedRoles: SALES_ROLES,
      },
      {
        label: "Medical Records",
        href: "/healthcare/records",
        icon: ClipboardList,
        allowedRoles: FINANCE_ROLES,
      },
      {
        label: "Pharmacy",
        href: "/healthcare/pharmacy",
        icon: Package,
        allowedRoles: STOCK_ROLES,
      },
    ],
  },
  {
    label: "NBFC Operations",
    icon: Landmark,
    requiredModule: "nbfc",
    items: [
      {
        label: "Loan Portfolio",
        href: "/nbfc",
        icon: Landmark,
        allowedRoles: FINANCE_ROLES,
      },
      {
        label: "Collections",
        href: "/nbfc/collections",
        icon: Receipt,
        allowedRoles: SALES_ROLES,
      },
      {
        label: "KYC Registry",
        href: "/nbfc/kyc",
        icon: ShieldCheck,
        allowedRoles: SALES_ROLES,
      },
    ],
  },
  {
    label: "Logistics",
    icon: Truck,
    requiredModule: "logistics",
    items: [
      {
        label: "Fleet Management",
        href: "/logistics",
        icon: Truck,
        allowedRoles: STOCK_ROLES,
      },
      {
        label: "Consignments",
        href: "/logistics/consignments",
        icon: ShoppingBag,
        allowedRoles: SALES_ROLES,
      },
    ],
  },
  {
    label: "Construction",
    icon: LayoutGrid,
    requiredModule: "construction",
    items: [
      {
        label: "Project Sites",
        href: "/construction",
        icon: LayoutGrid,
        allowedRoles: SALES_ROLES,
      },
      {
        label: "Task Console",
        href: "/projects",
        icon: ClipboardList,
        allowedRoles: SALES_ROLES,
      },
    ],
  },
  {
    label: "Project Management",
    icon: Briefcase,
    requiredModule: "projects",
    items: [
      {
        label: "Active Engagements",
        href: "/projects",
        icon: Briefcase,
        allowedRoles: SALES_ROLES,
      },
      {
        label: "Resource Planning",
        href: "/projects/resources",
        icon: Users,
        allowedRoles: STOCK_ROLES,
      },
    ],
  },
];

export const Sidebar = ({ onItemClick }: { onItemClick?: () => void }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = (user?.role as RoleName) || "Biller";

  const { pbac, hasPermission } = useUX();

  const [terminology, setTerminology] = useState<Record<string, string>>({});
  const [loadingConfig, setLoadingConfig] = useState(true);

  const fetchConfig = useCallback(async () => {
    // Check session cache first — avoid re-fetching on every navigation
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("nexus_sys_config");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setTerminology(parsed.terminology || {});
          setLoadingConfig(false);
          return;
        } catch {
          // ignore, refetch below
        }
      }
    }
    try {
      setLoadingConfig(true);
      const { data } = await api.get("system/config");
      if (data) {
        setTerminology(data.terminology || {});
        // Cache for the session so navigation doesn't re-fetch
        if (typeof window !== "undefined") {
          sessionStorage.setItem("nexus_sys_config", JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error("SIDEBAR: Failed to fetch industry config", err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch once on mount

  const enabledModules = useMemo(() => {
    const infrastructure = [
      "dashboard",
      "settings",
      "apps",
    ];
    return Array.from(new Set([...infrastructure, ...pbac.modules]));
  }, [pbac.modules]);

  const visibleStreams = businessStreams
    .filter(
      (stream) =>
        !stream.requiredModule ||
        enabledModules.includes(stream.requiredModule),
    )
    .map((stream) => {
      // Apply terminology to the stream label if it matches a project/site or similar concept
      let translatedStreamLabel = stream.label;
      if (stream.label === "Sales" && terminology["Sales"])
        translatedStreamLabel = terminology["Sales"];
      if (stream.label === "Construction" && terminology["Project"])
        translatedStreamLabel = terminology["Project"];
      if (stream.label === "Healthcare" && terminology["Clinic"])
        translatedStreamLabel = terminology["Clinic"];

      return {
        ...stream,
        label: translatedStreamLabel,
        items: stream.items
          .filter((item) => {
            let roleAllowed =
              user?.isSuperAdmin ||
              (item.allowedRoles as RoleName[]).includes(userRole);

            // Also check dynamic PBAC if available (fallback to role allowed if no PBAC mapped yet)
            // Example: check if user has * permissions
            if (!user?.isSuperAdmin && Object.keys(pbac.permissions).length > 0) {
              const baseResource = item.href.split("/")[1] || "dashboard";
              roleAllowed = hasPermission(baseResource, "read") || hasPermission("*", "*");
            }

            if (!roleAllowed) return false;

            const pathParts = item.href.split("/").filter((p) => p !== "");
            const moduleKey = pathParts[0];

            if (moduleKey) {
              if (
                moduleKey === "crm" ||
                moduleKey === "dashboard" ||
                moduleKey === "settings"
              )
                return true;
              if (!enabledModules.includes(moduleKey)) return false;
              return true;
            }
            return true;
          })
          .map((item) => {
            let translatedLabel = item.label;

            // Map specific UI labels to terminology keys
            const labelToKey: Record<string, string> = {
              CRM: "Customer",
              Products: "Product",
              Warehouses: "Inventory",
              "Work Orders": "WorkOrder",
              "Project Sites": "Project",
              Patients: "Customer",
              "Sales Orders": "Invoice",
              "Active Engagements": "Project",
            };

            const termKey = labelToKey[item.label];
            if (termKey && terminology[termKey]) {
              translatedLabel = terminology[termKey];
            }

            return { ...item, label: translatedLabel };
          }),
      };
    })
    .filter((stream) => stream.items.length > 0);

  const canAccessSettings = userRole === "Owner" || user?.isSuperAdmin;

  return (
    <div className="flex flex-col h-full bg-slate-50/50 border-r border-slate-100 text-slate-700">
      <div className="px-3 py-3 pb-1 shrink-0">
        <Link
          href="/dashboard"
          onClick={onItemClick}
          className="flex items-center transition-all hover:opacity-80"
        >
          {pbac.tenant?.logoUrl ? (
            <div className="flex items-center gap-3">
              <img
                src={pbac.tenant.logoUrl}
                alt={pbac.tenant.name || "Company Logo"}
                className="h-9 w-auto max-w-[140px] object-contain rounded-lg"
              />
            </div>
          ) : (
            <KlypsoLogo name={pbac.tenant?.name || user?.tenantName || "KLYPSO"} />
          )}
        </Link>
        {user?.isSuperAdmin && (
          <div className="mt-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-amber-500" />
            <span className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em]">
              System Sovereign
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2 space-y-2.5 min-h-0">
        <div className="space-y-0.5 mb-1.5">
          <Link
            href="/dashboard"
            onClick={onItemClick}
            className={cn(
              "text-xs group flex px-2.5 py-1.5 w-full justify-start font-bold cursor-pointer hover:bg-white rounded-xl transition-all duration-200 uppercase tracking-wider hover:scale-[1.01] active:scale-[0.98]",
              pathname === "/dashboard"
                ? "bg-white text-blue-600 shadow-lg shadow-blue-500/5"
                : "text-slate-500",
            )}
          >
            <div className="flex items-center flex-1">
              <LayoutDashboard
                className={cn(
                  "h-4 w-4 mr-3 transition-all duration-300 group-hover:rotate-12",
                  pathname === "/dashboard"
                    ? "text-blue-600"
                    : "text-slate-400 group-hover:text-blue-500",
                )}
              />
              Dashboard
            </div>
          </Link>
        </div>

        {visibleStreams.map((stream) => (
          <div key={stream.label} className="space-y-1">
            <div className="text-[9px] font-black text-slate-400 mb-1 px-2.5 tracking-[0.2em] uppercase">
              {stream.label}
            </div>
            {stream.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={onItemClick}
                  className={cn(
                    "text-xs group flex px-2.5 py-1.5 w-full justify-start font-bold cursor-pointer hover:bg-white rounded-xl transition-all duration-200 uppercase tracking-wider hover:scale-[1.01] active:scale-[0.98]",
                    isActive
                      ? "bg-white text-blue-600 shadow-lg shadow-blue-500/5"
                      : "text-slate-500",
                  )}
                >
                  <div className="flex items-center flex-1">
                    <item.icon
                      className={cn(
                        "h-4 w-4 mr-3 transition-all duration-500 group-hover:rotate-[20deg] group-hover:scale-125",
                        isActive
                          ? "text-blue-600"
                          : "text-slate-400 group-hover:text-blue-500",
                      )}
                    />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="shrink-0 p-3 pt-2 border-t border-slate-100 space-y-1">


        {canAccessSettings && (
          <Link
            href="/modules-setup"
            onClick={onItemClick}
            className={cn(
              "text-xs group flex px-3 py-2 w-full justify-start font-bold cursor-pointer hover:bg-white rounded-xl transition-all duration-200 uppercase tracking-wider hover:scale-[1.01] active:scale-[0.98]",
              pathname === "/modules-setup"
                ? "bg-white text-blue-600 shadow-lg shadow-blue-500/5"
                : "text-slate-500",
            )}
          >
            <div className="flex items-center flex-1">
              <Layers
                className={cn(
                  "h-4 w-4 mr-3 transition-all duration-300 group-hover:scale-110",
                  pathname === "/modules-setup"
                    ? "text-blue-600"
                    : "text-slate-400 group-hover:text-blue-500",
                )}
              />
              Configure Modules
            </div>
          </Link>
        )}

        {canAccessSettings && (
          <Link
            href="/settings"
            onClick={onItemClick}
            className={cn(
              "text-xs group flex px-3 py-2 w-full justify-start font-bold cursor-pointer hover:bg-white rounded-xl transition-all duration-200 uppercase tracking-wider hover:scale-[1.01] active:scale-[0.98]",
              pathname === "/settings"
                ? "bg-white text-blue-600 shadow-lg shadow-blue-500/5"
                : "text-slate-500",
            )}
          >
            <div className="flex items-center flex-1">
              <Settings
                className={cn(
                  "h-4 w-4 mr-3 transition-all duration-500 group-hover:rotate-90 group-hover:scale-125",
                  pathname === "/settings"
                    ? "text-blue-600"
                    : "text-slate-400 group-hover:text-blue-500",
                )}
              />
              Settings
            </div>
          </Link>
        )}

        <button
          onClick={() => {
            toast.info(
              "Use the workspace selector to switch between workspaces",
            );
          }}
          className="text-xs group flex px-3 py-2 w-full justify-start font-bold cursor-pointer hover:bg-white rounded-xl transition-all duration-200 uppercase tracking-wider text-slate-500 hover:scale-[1.01] active:scale-[0.98]"
        >
          <div className="flex items-center flex-1">
            <RefreshCw className="h-4 w-4 mr-3 text-slate-400 group-hover:text-blue-500 transition-all duration-300 group-hover:rotate-180" />
            Switch Workspace
          </div>
        </button>

        <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] text-slate-400 leading-relaxed font-bold uppercase tracking-tighter">
              Auto-Sync
            </p>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <p className="text-[10px] text-slate-900 font-black uppercase tracking-widest">
            {loadingConfig ? "Syncing..." : "Live Sync"}
          </p>
        </div>
      </div>
    </div>
  );
};
