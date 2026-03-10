
"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Shield, CreditCard, Bell, Globe, Zap } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Key, Trash2, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { ApiKeyManager } from "@/components/system/api-key-manager";
import { Role } from "@nexus/shared";

// Use shared Role enum instead of local string literals

interface Tenant {
    id: string;
    name: string;
    slug: string;
}

interface BillingQuota {
    maxUsers: number;
    maxProducts: number;
    aiEnabled: boolean;
}

interface BillingInfo {
    plan: string;
    quotas: BillingQuota;
}

interface Member {
    id: string;
    fullName: string;
    email: string;
    role: Role;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
    isWakeup?: boolean;
    message?: string;
}

export default function SettingsPage() {
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [orgName, setOrgName] = useState('');
    const [loading, setLoading] = useState(true);
    const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({ fullName: '', email: '', role: 'Biller' });
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user: currentUser } = useAuth();
    const isOwner = currentUser?.role === 'Owner';

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [profRes, billRes, usersRes] = await Promise.all([
                api.get("auth/profile"),
                api.get("system/billing/plan"),
                api.get("users")
            ]);
            setTenant(profRes.data?.tenant || null);
            setOrgName(profRes.data?.tenant?.name || '');
            setBillingInfo(billRes.data || null);
            setMembers(Array.isArray(usersRes.data) ? usersRes.data : []);
        } catch (err: unknown) {
            console.error(err);
            const error = err as ApiError;
            setError(error.isWakeup ? (error.message || "Wakeup error") : "Failed to load settings. Please refresh.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchSettings();
    }, [fetchSettings]);



    const handleAddUser = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("users", newUser);
            toast.success(`${newUser.fullName} added to the team`);
            setIsAddUserOpen(false);
            const res = await api.get("users");
            setMembers(Array.isArray(res.data) ? res.data : []);
        } catch {
            toast.error("Failed to add user");
        }
    }, [newUser]);

    const handleUpdateRole = useCallback(async (userId: string, role: Role) => {
        try {
            await api.patch(`/users/${userId}/role`, { role });
            toast.success("Role updated successfully");
            const res = await api.get("users");
            setMembers(Array.isArray(res.data) ? res.data : []);
        } catch {
            toast.error("Failed to update role");
        }
    }, []);

    const handleResetPassword = useCallback(async (userId: string) => {
        try {
            const res = await api.post(`/users/${userId}/reset-password`);
            setTempPassword(res.data.temporaryPassword);
            setIsResetOpen(true);
            toast.success("Temporary password generated");
        } catch {
            toast.error("Failed to generate password");
        }
    }, []);

    const handleRemoveUser = useCallback(async (userId: string) => {
        if (!confirm("Are you sure you want to remove this user? This cannot be undone.")) return;
        try {
            await api.delete(`/users/${userId}`);
            toast.success("User removed from tenant");
            const res = await api.get("users");
            setMembers(Array.isArray(res.data) ? res.data : []);
        } catch {
            toast.error("Failed to remove user");
        }
    }, []);

    const handleUpdate = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        toast.success("Settings updated successfully");
    }, []);

    const handleUpgrade = useCallback(async (plan: string) => {
        try {
            await api.post("system/billing/upgrade", { plan });
            toast.success(`Successfully upgraded to ${plan} plan`);
            location.reload();
        } catch {
            toast.error("Upgrade failed. Please try again.");
        }
    }, []);

    if (!mounted) return null; // Prevent hydration mismatch

    return (
        <div className="flex-1 space-y-6 md:space-y-8 pt-2 md:pt-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <Settings className="mr-3 h-8 w-8 text-slate-400" />
                        Settings
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">Manage your account, team, and billing preferences.</p>
                </div>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="bg-slate-100 border border-slate-200 p-1.5 rounded-2xl h-auto w-full flex flex-wrap justify-start overflow-x-auto snap-x">
                    <TabsTrigger value="general" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-xl px-4 md:px-6 py-2.5 font-bold transition-all snap-start">General</TabsTrigger>
                    <TabsTrigger value="team" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-xl px-4 md:px-6 py-2.5 font-bold transition-all snap-start">Company Team</TabsTrigger>
                    <TabsTrigger value="security" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-xl px-4 md:px-6 py-2.5 font-bold transition-all snap-start">Security</TabsTrigger>
                    <TabsTrigger value="billing" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-xl px-4 md:px-6 py-2.5 font-bold transition-all snap-start">Billing</TabsTrigger>
                    <TabsTrigger value="notifications" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-xl px-4 md:px-6 py-2.5 font-bold transition-all snap-start">Notifications</TabsTrigger>
                    <TabsTrigger value="connectivity" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-xl px-4 md:px-6 py-2.5 font-bold transition-all snap-start">Connectivity</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card className="bg-white border-slate-200 shadow-sm max-w-2xl">
                        <CardHeader>
                            <CardTitle className="text-slate-900 font-black flex items-center">
                                <Globe className="mr-2 h-5 w-5 text-sky-600" />
                                Company Profile
                            </CardTitle>
                            <CardDescription className="text-slate-500">Update your company name and workspace details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name" className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Organization Name</Label>
                                    <Input
                                        id="name"
                                        value={orgName}
                                        onChange={e => setOrgName(e.target.value)}
                                        className="bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500 h-10"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="slug" className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Workspace Identifier (Slug)</Label>
                                    <Input
                                        id="slug"
                                        defaultValue={tenant?.slug}
                                        disabled
                                        className="bg-slate-100 border-slate-200 text-slate-400 font-mono h-10"
                                    />
                                    <p className="text-[11px] text-slate-400 italic font-medium">This ID is fixed and cannot be changed.</p>
                                </div>
                                <div className="pt-4">
                                    <Button type="submit" className="bg-slate-900 hover:bg-slate-950 text-white font-bold h-11 px-8 rounded-xl">Save Changes</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="team">
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
                            <div>
                                <h3 className="font-black text-slate-900">Team Members</h3>
                                <p className="text-xs text-slate-500 font-medium">Manage employees and their access levels.</p>
                            </div>
                            <Button className="bg-slate-900 hover:bg-slate-950 font-bold gap-2 w-full sm:w-auto justify-center" onClick={() => setIsAddUserOpen(true)}>
                                <UserPlus className="h-4 w-4" />
                                Add Member
                            </Button>
                        </div>

                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="p-8 flex flex-col items-center justify-center gap-4">
                                        <div className="h-8 w-8 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Loading team...</p>
                                    </div>
                                ) : error ? (
                                    <div className="p-12 text-center space-y-4">
                                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                                            <ShieldAlert className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-black text-slate-900 uppercase tracking-tight">Connection Error</h3>
                                            <p className="text-xs text-slate-500 font-medium">{error}</p>
                                        </div>
                                        <Button onClick={fetchSettings} variant="outline" className="font-bold border-slate-200">
                                            Try Again
                                        </Button>
                                    </div>
                                ) : members.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400 font-medium text-sm">No team members found.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {(members || []).map((member) => (
                                            <div key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400">
                                                        {member.fullName ? member.fullName[0] : '?'}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900">{member.fullName}</div>
                                                        <div className="text-[11px] text-slate-400 font-medium">{member.email}</div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-4">
                                                    <Badge className={`font-black ${member.role === 'Owner' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                        member.role === 'Manager' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            'bg-slate-50 text-slate-500 border-slate-100'
                                                        }`}>
                                                        {member.role ? (typeof member.role === 'string' ? member.role.toUpperCase() : 'USER') : 'UNKNOWN'}
                                                    </Badge>

                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        {isOwner && member.email !== currentUser?.email && (
                                                            <>
                                                                <Select onValueChange={(val: Role) => handleUpdateRole(member.id, val)}>
                                                                    <SelectTrigger className="w-[120px] h-8 text-xs font-bold border-slate-200">
                                                                        <SelectValue placeholder="Change Role" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="bg-white">
                                                                        {['Owner', 'Manager', 'Biller', 'Storekeeper', 'Accountant', 'CA'].map(r => (
                                                                            <SelectItem key={r} value={r} className="text-xs font-bold">{r}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                                                    title="Reset Password"
                                                                    onClick={() => handleResetPassword(member.id)}
                                                                >
                                                                    <Key className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                                    title="Remove Member"
                                                                    onClick={() => handleRemoveUser(member.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="security">
                    <Card className="bg-white border-slate-200 shadow-sm max-w-2xl">
                        <CardHeader>
                            <CardTitle className="text-slate-900 font-black flex items-center">
                                <Shield className="mr-2 h-5 w-5 text-emerald-600" />
                                Security
                            </CardTitle>
                            <CardDescription className="text-slate-500">Manage authentication methods and audit logging.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold text-slate-900 tracking-tight">Multi-Factor Authentication</div>
                                    <div className="text-xs text-slate-500">Add an extra layer of security to your account.</div>
                                </div>
                                <Button variant="outline" className="border-slate-200 text-slate-600 font-bold bg-white">Configure</Button>
                            </div>
                            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold text-slate-900 tracking-tight">Active Sessions</div>
                                    <div className="text-xs text-slate-500">Monitor and manage your active system sessions.</div>
                                </div>
                                <Button variant="outline" className="border-slate-200 text-slate-600 font-bold bg-white">View Active</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="billing">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-slate-900 font-black flex items-center">
                                    <CreditCard className="mr-2 h-5 w-5 text-amber-600" />
                                    Active Plan
                                </CardTitle>
                                <CardDescription className="text-slate-500">Your current plan and usage limits.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-6 rounded-2xl bg-slate-900 border-b-4 border-indigo-500 shadow-xl overflow-hidden relative">
                                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                                    <Badge className="mb-2 bg-indigo-600 text-white font-black">{billingInfo?.plan}</Badge>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                                        {billingInfo?.plan === 'Free' ? 'Free Plan' : 'Enterprise Plan'}
                                    </h3>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Status: Active</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-bold uppercase tracking-tight text-[11px]">User Seats</span>
                                        <span className="text-slate-900 font-black font-mono">{billingInfo?.quotas?.maxUsers}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-bold uppercase tracking-tight text-[11px]">SKU Capacity</span>
                                        <span className="text-slate-900 font-black font-mono">{billingInfo?.quotas?.maxProducts.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-bold uppercase tracking-tight text-[11px]">AI Engine</span>
                                        <Badge variant="outline" className={billingInfo?.quotas?.aiEnabled ? "border-emerald-500/20 text-emerald-600 font-black bg-emerald-50" : "border-slate-100 text-slate-400"}>
                                            {billingInfo?.quotas?.aiEnabled ? 'ENABLED' : 'DISABLED'}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-slate-900 font-black flex items-center">
                                    <Zap className="mr-2 h-5 w-5 text-amber-600" />
                                    Upgrade Plan
                                </CardTitle>
                                <CardDescription className="text-slate-500">Unlock more features and higher limits.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {['Pro', 'Enterprise'].map(tier => (
                                    <div key={tier} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between hover:border-indigo-500 transition-all group cursor-pointer hover:bg-white">
                                        <div>
                                            <div className="text-sm font-black text-slate-900 tracking-tight">{tier} Configuration</div>
                                            <div className="text-[10px] text-slate-500 font-medium font-mono uppercase tracking-widest">More features & higher limits</div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="border-slate-200 text-slate-900 font-bold hover:bg-slate-900 hover:text-white transition-all px-6"
                                            onClick={() => handleUpgrade(tier)}
                                            disabled={billingInfo?.plan === tier}
                                        >
                                            {billingInfo?.plan === tier ? 'Active' : 'Upgrade'}
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="notifications">
                    <Card className="bg-white border-slate-200 shadow-sm max-w-2xl">
                        <CardHeader>
                            <CardTitle className="text-slate-900 font-black flex items-center">
                                <Bell className="mr-2 h-5 w-5 text-rose-600" />
                                Notifications
                            </CardTitle>
                            <CardDescription className="text-slate-500">Choose how you want to receive alerts and updates.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-400 text-sm italic font-medium">Notifications are currently turned off.</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="connectivity">
                    <div className="max-w-4xl">
                        <ApiKeyManager />
                    </div>
                </TabsContent>
            </Tabs>

            {/* Add User Modal */}
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900">Onboard New Team Member</DialogTitle>
                        <DialogDescription className="text-slate-500">Add an employee to your organization and assign their functional access role.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddUser} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Full Name</Label>
                            <Input
                                placeholder="e.g. Anita Biller"
                                className="bg-slate-50 border-slate-200 h-11"
                                required
                                value={newUser.fullName}
                                onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Professional Email</Label>
                            <Input
                                type="email"
                                placeholder="name@woodcraft.com"
                                className="bg-slate-50 border-slate-200 h-11"
                                required
                                value={newUser.email}
                                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Role</Label>
                            <Select value={newUser.role} onValueChange={(val: any) => setNewUser({ ...newUser, role: val })}>
                                <SelectTrigger className="bg-slate-50 border-slate-200 h-11 font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="Owner" className="font-bold">Owner (Full System Access)</SelectItem>
                                    <SelectItem value="Manager" className="font-bold">Manager (Operational Admin)</SelectItem>
                                    <SelectItem value="Biller" className="font-bold">Biller (Checkout & Sales)</SelectItem>
                                    <SelectItem value="Storekeeper" className="font-bold">Storekeeper (Stock & Logistics)</SelectItem>
                                    <SelectItem value="Accountant" className="font-bold">Accountant (Finance & Audit)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" className="font-bold" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-slate-900 hover:bg-black font-black px-8">Add Member</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Password Reset Modal */}
            <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-sm bg-white">
                    <DialogHeader>
                        <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-2 mx-auto">
                            <Key className="h-6 w-6 text-amber-600" />
                        </div>
                        <DialogTitle className="text-xl font-black text-slate-900 text-center">Temporary Password</DialogTitle>
                        <DialogDescription className="text-center text-slate-500">Share this temporary password with the employee. They should change it after logging in.</DialogDescription>
                    </DialogHeader>
                    <div className="py-6 flex flex-col items-center justify-center gap-4">
                        <div className="text-3xl font-black font-mono tracking-widest bg-slate-100 p-4 rounded-xl border-b-2 border-slate-200 w-full text-center text-slate-900">
                            {tempPassword}
                        </div>
                        <Button
                            className="w-full font-bold bg-slate-900"
                            onClick={async () => {
                                await navigator.clipboard.writeText(tempPassword || '');
                                toast.success("Key copied to clipboard");
                            }}
                        >
                            Copy to Clipboard
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
