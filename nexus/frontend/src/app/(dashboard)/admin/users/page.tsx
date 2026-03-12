
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Users,
    Search,
    Shield,
    Crown,
    Settings,
    Lock as LockIcon,
    Unlock as UnlockIcon,
    KeyRound,
    Eye,
    X,
    Building2,
    BarChart3,
    ArrowLeft,
    Check,
    AlertTriangle,
    Puzzle,
    Save,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ────────────────── Types ──────────────────

interface TenantUser {
    id: string;
    role: string;
    user: {
        id: string;
        email: string;
        fullName: string | null;
        avatarUrl: string | null;
        createdAt: string;
        mfaEnabled: boolean;
        authProvider: string;
        isSuperAdmin: boolean;
        failedLoginAttempts: number;
        lockoutUntil: string | null;
    };
}

interface TenantListItem {
    id: string;
    name: string;
    slug: string;
    plan: string;
    industry: string | null;
    type: string | null;
    subscriptionStatus: string;
    createdAt: string;
    planExpiresAt: string | null;
    suspendReason: string | null;
    suspendedAt: string | null;
    state: string | null;
    gstin: string | null;
    isOnboarded: boolean;
    userCount: number;
    owner: { id: string; email: string; fullName: string | null } | null;
    users: TenantUser[];
}

interface PlanStats {
    total: number;
    byPlan: Record<string, number>;
    byStatus: Record<string, number>;
}

interface ModalTargetProperties {
    id: string;
    fullName?: string | null;
    email?: string;
    name?: string;
    lockoutUntil?: string | null;
}

// ────────────────── Constants ──────────────────

const PLANS = ["Free", "Starter", "Growth", "Business", "Enterprise"];
const STATUSES = ["Active", "GracePeriod", "ReadOnly", "Suspended"];
const ALL_MODULES = [
    "accounting", "inventory", "manufacturing", "hr", "crm",
    "purchases", "sales", "healthcare", "nbfc", "logistics",
    "construction", "projects",
];

const PLAN_COLORS: Record<string, string> = {
    Free: "bg-slate-100 text-slate-600",
    Starter: "bg-blue-50 text-blue-600",
    Growth: "bg-emerald-50 text-emerald-600",
    Business: "bg-violet-50 text-violet-600",
    Enterprise: "bg-amber-50 text-amber-700",
};

const STATUS_COLORS: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-600",
    GracePeriod: "bg-amber-50 text-amber-600",
    ReadOnly: "bg-orange-50 text-orange-600",
    Suspended: "bg-red-50 text-red-600",
};

// ────────────────── Component ──────────────────

export default function SuperAdminPage() {
    const router = useRouter();
    const [tenants, setTenants] = useState<TenantListItem[]>([]);
    const [stats, setStats] = useState<PlanStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterPlan, setFilterPlan] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    // Detail view state
    const [selectedTenant, setSelectedTenant] = useState<TenantListItem | null>(null);

    // Modal states
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showModuleModal, setShowModuleModal] = useState(false);
    const [modalTarget, setModalTarget] = useState<ModalTargetProperties | null>(null);

    // Form states
    const [newPlan, setNewPlan] = useState("");
    const [newStatus, setNewStatus] = useState("");
    const [suspendReason, setSuspendReason] = useState("");
    const [editFullName, setEditFullName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [tempPassword, setTempPassword] = useState("");
    const [moduleList, setModuleList] = useState<string[]>([]);
    const [actionLoading, setActionLoading] = useState(false);

    // ──────── Data Fetching ────────

    const fetchTenants = useCallback(async () => {
        try {
            const params: Record<string, string> = {};
            if (search) params.search = search;
            if (filterPlan) params.plan = filterPlan;
            if (filterStatus) params.status = filterStatus;
            const res = await api.get("super-admin/tenants", { params });
            setTenants(res.data);
        } catch {
            toast.error("Failed to load tenants");
        }
    }, [search, filterPlan, filterStatus]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get("super-admin/stats");
            setStats(res.data);
        } catch {
            // silent
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchTenants(), fetchStats()]);
            setLoading(false);
        };
        load();
    }, [fetchTenants, fetchStats]);

    const openTenantDetail = async (tenant: TenantListItem) => {
        setSelectedTenant(tenant);
        try {
            const res = await api.get(`super-admin/tenants/${tenant.id}`);
            setSelectedTenant({ ...tenant, ...res.data });
        } catch {
            toast.error("Failed to load tenant details");
        }
    };

    // ──────── Actions ────────

    const handleUpdatePlan = async () => {
        try {
            const target = modalTarget as { id: string };
            await api.patch(`super-admin/tenants/${target.id}/plan`, { plan: newPlan });
            toast.success(`Plan updated to ${newPlan}`);
            setShowPlanModal(false);
            await fetchTenants();
            await fetchStats();
            if (selectedTenant?.id === target.id) {
                await openTenantDetail(target as TenantListItem);
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Failed to update plan");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateStatus = async () => {
        try {
            const target = modalTarget as { id: string };
            await api.patch(`super-admin/tenants/${target.id}/status`, {
                status: newStatus,
                reason: suspendReason || undefined,
            });
            toast.success(`Status updated to ${newStatus}`);
            setShowStatusModal(false);
            await fetchTenants();
            await fetchStats();
            if (selectedTenant?.id === target.id) {
                await openTenantDetail(target as TenantListItem);
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Failed to update status");
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetPassword = async () => {
        try {
            const target = modalTarget as { id: string };
            const res = await api.post(`super-admin/users/${target.id}/reset-password`);
            setTempPassword(res.data.temporaryPassword);
            toast.success("Password reset successful");
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Failed to reset password");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!modalTarget) return;
        setActionLoading(true);
        try {
            const target = modalTarget as { id: string };
            await api.patch(`super-admin/users/${target.id}/profile`, {
                fullName: editFullName,
                email: editEmail,
            });
            toast.success("Profile updated");
            setShowProfileModal(false);
            if (selectedTenant) await openTenantDetail(selectedTenant);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleUserBlock = async () => {
        if (!modalTarget) return;
        setActionLoading(true);
        const target = modalTarget as { id: string; lockoutUntil?: string | null };
        const isCurrentlyBlocked = target.lockoutUntil && new Date(target.lockoutUntil) > new Date();
        try {
            await api.patch(`super-admin/users/${target.id}/block`, { block: !isCurrentlyBlocked });
            toast.success(`User ${!isCurrentlyBlocked ? 'blocked' : 'unblocked'}`);
            setShowDeleteModal(false);
            if (selectedTenant) await openTenantDetail(selectedTenant);
            await fetchTenants();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Failed to update user status");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveModules = async () => {
        if (!modalTarget) return;
        setActionLoading(true);
        try {
            const target = modalTarget as { id: string };
            await api.patch(`super-admin/tenants/${target.id}/modules`, { modules: moduleList });
            toast.success("Module access updated");
            setShowModuleModal(false);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Failed to update modules");
        } finally {
            setActionLoading(false);
        }
    };

    const openModuleModal = async (tenant: TenantListItem) => {
        setModalTarget(tenant);
        try {
            const res = await api.get(`super-admin/tenants/${tenant.id}/modules`);
            setModuleList(res.data.enabledModules || []);
        } catch {
            setModuleList([]);
        }
        setShowModuleModal(true);
    };

    // ──────── Render ────────

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-slate-400 font-black uppercase tracking-widest text-sm animate-pulse">
                    Loading Super Admin Console...
                </p>
            </div>
        );
    }

    // ──── Detail View ────
    if (selectedTenant) {
        return (
            <div className="p-4 md:p-10 space-y-8 bg-slate-50/50 min-h-screen pb-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedTenant(null)}
                        className="h-12 w-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">{selectedTenant.name}</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">{selectedTenant.slug}</p>
                    </div>
                    <div className="ml-auto flex gap-3">
                        <Badge className={`${PLAN_COLORS[selectedTenant.plan] || "bg-slate-100 text-slate-600"} text-[10px] font-black uppercase tracking-widest px-4 py-2 border-none`}>
                            {selectedTenant.plan}
                        </Badge>
                        <Badge className={`${STATUS_COLORS[selectedTenant.subscriptionStatus] || "bg-slate-100 text-slate-600"} text-[10px] font-black uppercase tracking-widest px-4 py-2 border-none`}>
                            {selectedTenant.subscriptionStatus}
                        </Badge>
                    </div>
                </div>

                {/* Tenant Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-white border-none shadow-xl shadow-slate-200/40 p-6 rounded-[28px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Industry</p>
                        <p className="text-xl font-black mt-2 text-slate-900">{selectedTenant.industry || selectedTenant.type || "General"}</p>
                    </Card>
                    <Card className="bg-white border-none shadow-xl shadow-slate-200/40 p-6 rounded-[28px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Users</p>
                        <p className="text-xl font-black mt-2 text-slate-900">{selectedTenant.users?.length || selectedTenant.userCount}</p>
                    </Card>
                    <Card className="bg-white border-none shadow-xl shadow-slate-200/40 p-6 rounded-[28px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">State / GSTIN</p>
                        <p className="text-xl font-black mt-2 text-slate-900">{selectedTenant.state || "N/A"}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{selectedTenant.gstin || "No GSTIN"}</p>
                    </Card>
                    <Card className="bg-white border-none shadow-xl shadow-slate-200/40 p-6 rounded-[28px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Created</p>
                        <p className="text-xl font-black mt-2 text-slate-900">
                            {new Date(selectedTenant.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                    </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                    <Button
                        onClick={() => { setModalTarget(selectedTenant); setNewPlan(selectedTenant.plan); setShowPlanModal(true); }}
                        className="h-12 px-6 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-500/20"
                    >
                        <Crown className="w-4 h-4 mr-2" /> Change Plan
                    </Button>
                    <Button
                        onClick={() => { setModalTarget(selectedTenant); setNewStatus(selectedTenant.subscriptionStatus); setSuspendReason(""); setShowStatusModal(true); }}
                        className="h-12 px-6 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20"
                    >
                        {selectedTenant.subscriptionStatus === "Suspended" ? <UnlockIcon className="w-4 h-4 mr-2" /> : <LockIcon className="w-4 h-4 mr-2" />}
                        {selectedTenant.subscriptionStatus === "Suspended" ? "Activate" : "Change Status"}
                    </Button>
                    <Button
                        onClick={() => openModuleModal(selectedTenant)}
                        className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
                    >
                        <Puzzle className="w-4 h-4 mr-2" /> Module Access
                    </Button>
                </div>

                {/* Users Table */}
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight mb-6 flex items-center gap-3">
                        <Users className="w-6 h-6 text-slate-400" />
                        Team Members
                    </h2>
                    <div className="space-y-4">
                        {(selectedTenant.users || []).map((tu: TenantUser) => (
                            <Card key={tu.id} className="bg-white border-none shadow-lg shadow-slate-200/30 p-6 rounded-[24px] flex flex-col lg:flex-row items-start lg:items-center gap-6 justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-lg">
                                        {(tu.user.fullName || tu.user.email).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900">{tu.user.fullName || "Unnamed"}</p>
                                        <p className="text-xs text-slate-400">{tu.user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{tu.role}</Badge>
                                    {tu.user.mfaEnabled && <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black">MFA</Badge>}
                                    {tu.user.isSuperAdmin && <Badge className="bg-amber-50 text-amber-600 border-none text-[9px] font-black">SUPER ADMIN</Badge>}
                                    {tu.user.lockoutUntil && new Date(tu.user.lockoutUntil) > new Date() && (
                                        <Badge className="bg-red-50 text-red-600 border-none text-[9px] font-black">LOCKED</Badge>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setModalTarget(tu.user);
                                            setEditFullName(tu.user.fullName || "");
                                            setEditEmail(tu.user.email);
                                            setShowProfileModal(true);
                                        }}
                                        className="h-10 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 transition-all flex items-center gap-2"
                                        title="Edit Profile"
                                    >
                                        <Settings className="w-3 h-3" /> Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setModalTarget(tu.user);
                                            setTempPassword("");
                                            setShowPasswordModal(true);
                                        }}
                                        className="h-10 px-4 bg-blue-50 hover:bg-blue-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-600 transition-all flex items-center gap-2"
                                        title="Reset Password"
                                    >
                                        <KeyRound className="w-3 h-3" /> Password
                                    </button>
                                    {!tu.user.isSuperAdmin && (
                                        <button
                                            onClick={() => { setModalTarget(tu.user); setShowDeleteModal(true); }}
                                            className={`h-10 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${tu.user.lockoutUntil && new Date(tu.user.lockoutUntil) > new Date() ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600' : 'bg-red-50 hover:bg-red-100 text-red-600'}`}
                                            title={tu.user.lockoutUntil && new Date(tu.user.lockoutUntil) > new Date() ? "Unblock User" : "Block User"}
                                        >
                                            {tu.user.lockoutUntil && new Date(tu.user.lockoutUntil) > new Date() ? <UnlockIcon className="w-3 h-3" /> : <LockIcon className="w-3 h-3" />}
                                            {tu.user.lockoutUntil && new Date(tu.user.lockoutUntil) > new Date() ? "Unblock" : "Block"}
                                        </button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* ──── Modals ──── */}

                {/* Plan Modal */}
                {showPlanModal && (
                    <ModalOverlay onClose={() => setShowPlanModal(false)} title="Change Subscription Plan">
                        <div className="space-y-3">
                            {PLANS.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setNewPlan(p)}
                                    className={`w-full p-4 rounded-2xl text-left font-black text-sm transition-all border-2 ${newPlan === p ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-100 bg-white text-slate-600 hover:border-slate-200"}`}
                                >
                                    <div className="flex items-center justify-between">
                                        {p}
                                        {newPlan === p && <Check className="w-5 h-5 text-violet-600" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <Button onClick={handleUpdatePlan} disabled={actionLoading} className="w-full h-14 mt-6 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                            {actionLoading ? "Updating..." : "Confirm Plan Change"}
                        </Button>
                    </ModalOverlay>
                )}

                {/* Status Modal */}
                {showStatusModal && (
                    <ModalOverlay onClose={() => setShowStatusModal(false)} title="Change Subscription Status">
                        <div className="space-y-3">
                            {STATUSES.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setNewStatus(s)}
                                    className={`w-full p-4 rounded-2xl text-left font-black text-sm transition-all border-2 ${newStatus === s ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-100 bg-white text-slate-600 hover:border-slate-200"}`}
                                >
                                    <div className="flex items-center justify-between">
                                        {s}
                                        {newStatus === s && <Check className="w-5 h-5 text-amber-600" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                        {newStatus === "Suspended" && (
                            <input
                                value={suspendReason}
                                onChange={(e) => setSuspendReason(e.target.value)}
                                placeholder="Reason for suspension..."
                                className="w-full mt-4 h-14 px-6 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        )}
                        <Button onClick={handleUpdateStatus} disabled={actionLoading} className="w-full h-14 mt-6 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                            {actionLoading ? "Updating..." : "Confirm Status Change"}
                        </Button>
                    </ModalOverlay>
                )}

                {/* Password Reset Modal */}
                {showPasswordModal && (
                    <ModalOverlay onClose={() => setShowPasswordModal(false)} title="Reset User Password">
                        <p className="text-sm text-slate-500 mb-6">
                            This will generate a new temporary password for <strong>{modalTarget?.fullName || modalTarget?.email}</strong>. The user will need to change it on next login.
                        </p>
                        {tempPassword ? (
                            <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-200">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">New Temporary Password</p>
                                <p className="text-2xl font-black text-emerald-800 font-mono tracking-wider select-all">{tempPassword}</p>
                                <p className="text-[10px] text-emerald-500 mt-3">Copy this password now. It will not be shown again.</p>
                            </div>
                        ) : (
                            <Button onClick={handleResetPassword} disabled={actionLoading} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                                {actionLoading ? "Resetting..." : "Generate New Password"}
                            </Button>
                        )}
                    </ModalOverlay>
                )}

                {/* Profile Edit Modal */}
                {showProfileModal && (
                    <ModalOverlay onClose={() => setShowProfileModal(false)} title="Edit User Profile">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Full Name</label>
                                <input
                                    value={editFullName}
                                    onChange={(e) => setEditFullName(e.target.value)}
                                    className="w-full h-14 px-6 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Email</label>
                                <input
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className="w-full h-14 px-6 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <Button onClick={handleUpdateProfile} disabled={actionLoading} className="w-full h-14 mt-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                            {actionLoading ? "Saving..." : "Save Changes"}
                        </Button>
                    </ModalOverlay>
                )}

                {/* Block Confirmation Modal (reusing delete modal state) */}
                {showDeleteModal && (
                    <ModalOverlay onClose={() => setShowDeleteModal(false)} title={modalTarget?.lockoutUntil && new Date(modalTarget.lockoutUntil) > new Date() ? "Confirm User Unblock" : "Confirm User Block"}>
                        <div className={`p-6 rounded-2xl border-2 mb-6 ${modalTarget?.lockoutUntil && new Date(modalTarget.lockoutUntil) > new Date() ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <AlertTriangle className={`w-6 h-6 ${modalTarget?.lockoutUntil && new Date(modalTarget.lockoutUntil) > new Date() ? 'text-emerald-600' : 'text-red-600'}`} />
                                <p className={`font-black ${modalTarget?.lockoutUntil && new Date(modalTarget.lockoutUntil) > new Date() ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {modalTarget?.lockoutUntil && new Date(modalTarget.lockoutUntil) > new Date() ? "Restore Access" : "Block Access"}
                                </p>
                            </div>
                            {modalTarget?.lockoutUntil && new Date(modalTarget.lockoutUntil) > new Date()
                                ? `You are about to restore access for user `
                                : `You are about to immediately block `}
                            <strong>{modalTarget?.fullName || modalTarget?.email}</strong>.
                            {!modalTarget?.lockoutUntil || new Date(modalTarget.lockoutUntil) <= new Date() ? " They will be instantly logged out and unable to access the system until unblocked." : ""}
                        </div>
                        <div className="flex gap-4">
                            <Button onClick={() => setShowDeleteModal(false)} variant="outline" className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</Button>
                            <Button onClick={handleToggleUserBlock} disabled={actionLoading} className={`flex-1 h-14 text-white rounded-2xl font-black text-xs uppercase tracking-widest ${modalTarget?.lockoutUntil && new Date(modalTarget.lockoutUntil) > new Date() ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                {actionLoading ? "Updating..." : (modalTarget?.lockoutUntil && new Date(modalTarget.lockoutUntil) > new Date() ? "Unblock User" : "Block User")}
                            </Button>
                        </div>
                    </ModalOverlay>
                )}

                {/* Module Access Modal */}
                {showModuleModal && (
                    <ModalOverlay onClose={() => setShowModuleModal(false)} title="Manage Module Access">
                        <p className="text-sm text-slate-500 mb-6">
                            Toggle modules for <strong>{modalTarget?.name}</strong>. Predefined modules come from the industry config. You can enable additional modules here.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {ALL_MODULES.map((mod) => {
                                const enabled = moduleList.includes(mod);
                                return (
                                    <button
                                        key={mod}
                                        onClick={() => {
                                            if (enabled) {
                                                setModuleList(moduleList.filter((m) => m !== mod));
                                            } else {
                                                setModuleList([...moduleList, mod]);
                                            }
                                        }}
                                        className={`p-4 rounded-2xl text-left font-black text-xs uppercase tracking-widest transition-all border-2 ${enabled ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            {mod}
                                            {enabled && <Check className="w-4 h-4 text-blue-600" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <Button onClick={handleSaveModules} disabled={actionLoading} className="w-full h-14 mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                            <Save className="w-4 h-4 mr-2" />
                            {actionLoading ? "Saving..." : "Save Module Access"}
                        </Button>
                    </ModalOverlay>
                )}
            </div>
        );
    }

    // ──── Main List View ────
    return (
        <div className="p-4 md:p-10 space-y-8 md:space-y-12 bg-slate-50/50 text-slate-900 min-h-screen pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-4">
                        <div className="p-3 bg-slate-900 rounded-2xl shadow-xl">
                            <Shield className="h-7 w-7 text-amber-400" />
                        </div>
                        Super Admin Console
                    </h1>
                    <p className="text-slate-500 mt-2 font-black uppercase text-[11px] tracking-[0.3em] ml-[68px]">
                        Tenant & User Management
                    </p>
                </div>
                <Button
                    onClick={() => router.push("/portal/admin/monitoring")}
                    variant="outline"
                    className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                >
                    <BarChart3 className="w-4 h-4 mr-2" /> Business Monitoring
                </Button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <Card className="bg-white border-none shadow-xl shadow-slate-200/40 p-6 rounded-[28px] text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                        <p className="text-3xl font-black mt-1 text-slate-900">{stats.total}</p>
                    </Card>
                    {PLANS.map((plan) => (
                        <Card key={plan} className="bg-white border-none shadow-xl shadow-slate-200/40 p-6 rounded-[28px] text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{plan}</p>
                            <p className="text-3xl font-black mt-1 text-slate-900">{stats.byPlan[plan] || 0}</p>
                        </Card>
                    ))}
                </div>
            )}

            {/* Search + Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search tenants by name or slug..."
                        className="w-full h-14 pl-14 pr-6 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                </div>
                <select
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value)}
                    className="h-14 px-6 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none font-bold text-slate-600 min-w-[160px]"
                >
                    <option value="">All Plans</option>
                    {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-14 px-6 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none font-bold text-slate-600 min-w-[160px]"
                >
                    <option value="">All Statuses</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Tenant List */}
            <div className="space-y-4">
                {tenants.length === 0 ? (
                    <Card className="bg-white border-none shadow-xl shadow-slate-200/40 p-12 rounded-[32px] text-center">
                        <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No tenants found</p>
                    </Card>
                ) : (
                    tenants.map((tenant) => (
                        <Card
                            key={tenant.id}
                            className="bg-white border-none shadow-xl shadow-slate-200/40 p-6 lg:p-8 rounded-[28px] hover:shadow-2xl transition-all cursor-pointer group"
                            onClick={() => openTenantDetail(tenant)}
                        >
                            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-lg shrink-0 group-hover:bg-blue-600 transition-colors">
                                        {tenant.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900 tracking-tight">{tenant.name}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] text-slate-400 font-bold">{tenant.slug}</span>
                                            <span className="text-[10px] text-slate-300">|</span>
                                            <span className="text-[10px] text-slate-400 font-bold">{tenant.industry || tenant.type || "General"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <Badge className={`${PLAN_COLORS[tenant.plan] || "bg-slate-100 text-slate-600"} text-[9px] font-black uppercase tracking-widest px-3 py-1.5 border-none`}>
                                        {tenant.plan}
                                    </Badge>
                                    <Badge className={`${STATUS_COLORS[tenant.subscriptionStatus] || "bg-slate-100 text-slate-600"} text-[9px] font-black uppercase tracking-widest px-3 py-1.5 border-none`}>
                                        {tenant.subscriptionStatus}
                                    </Badge>
                                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg">
                                        <Users className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-500">{tenant.userCount}</span>
                                    </div>
                                    {tenant.owner && (
                                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg">
                                            <Crown className="w-3 h-3 text-amber-500" />
                                            <span className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">{tenant.owner.email}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => openTenantDetail(tenant)}
                                        className="h-10 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 transition-all flex items-center gap-2"
                                    >
                                        <Eye className="w-3 h-3" /> View
                                    </button>
                                    <button
                                        onClick={() => { setModalTarget(tenant); setNewPlan(tenant.plan); setShowPlanModal(true); }}
                                        className="h-10 px-4 bg-violet-50 hover:bg-violet-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-violet-600 transition-all flex items-center gap-2"
                                    >
                                        <Crown className="w-3 h-3" /> Plan
                                    </button>
                                    <button
                                        onClick={() => { setModalTarget(tenant); setNewStatus(tenant.subscriptionStatus); setSuspendReason(""); setShowStatusModal(true); }}
                                        className={`h-10 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${tenant.subscriptionStatus === "Suspended" ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-600" : "bg-red-50 hover:bg-red-100 text-red-600"}`}
                                    >
                                        {tenant.subscriptionStatus === "Suspended" ? <UnlockIcon className="w-3 h-3" /> : <LockIcon className="w-3 h-3" />}
                                        {tenant.subscriptionStatus === "Suspended" ? "Activate" : "Block"}
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

// ────────────────── Modal Overlay ──────────────────

function ModalOverlay({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-[32px] shadow-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
                    <button onClick={onClose} className="h-10 w-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-all">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
