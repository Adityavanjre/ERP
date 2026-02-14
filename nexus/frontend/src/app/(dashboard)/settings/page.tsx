
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Shield, CreditCard, Bell, Globe, Zap } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Key, Trash2, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { ApiKeyManager } from "@/components/kernel/api-key-manager";

type RoleName = 'Owner' | 'Manager' | 'Biller' | 'Storekeeper' | 'Accountant' | 'CA';

export default function SettingsPage() {
    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [billingInfo, setBillingInfo] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({ fullName: '', email: '', role: 'Biller' as RoleName });
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const { user: currentUser } = useAuth();
    const isOwner = currentUser?.role === 'Owner';

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const [profRes, billRes, usersRes] = await Promise.all([
                    api.get("/auth/profile"),
                    api.get("/kernel/billing/plan"),
                    api.get("/users")
                ]);
                setTenant(profRes.data.tenant);
                setBillingInfo(billRes.data);
                setMembers(usersRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/users", newUser);
            toast.success(`${newUser.fullName} added to the team`);
            setIsAddUserOpen(false);
            const res = await api.get("/users");
            setMembers(res.data);
        } catch (err) {
            toast.error("Failed to add user");
        }
    };

    const handleUpdateRole = async (userId: string, role: RoleName) => {
        try {
            await api.patch(`/users/${userId}/role`, { role });
            toast.success("Role updated successfully");
            const res = await api.get("/users");
            setMembers(res.data);
        } catch (err) {
            toast.error("Failed to update role");
        }
    };

    const handleResetPassword = async (userId: string) => {
        try {
            const res = await api.post(`/users/${userId}/reset-password`);
            setTempPassword(res.data.temporaryPassword);
            setIsResetOpen(true);
            toast.success("Temporary password generated");
        } catch (err) {
            toast.error("Failed to generate password");
        }
    };

    const handleRemoveUser = async (userId: string) => {
        if (!confirm("Are you sure you want to remove this user? This cannot be undone.")) return;
        try {
            await api.delete(`/users/${userId}`);
            toast.success("User removed from tenant");
            const res = await api.get("/users");
            setMembers(res.data);
        } catch (err) {
            toast.error("Failed to remove user");
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        toast.success("Enterprise configuration updated successfully");
    };

    const handleUpgrade = async (plan: string) => {
        try {
            await api.post("/kernel/billing/upgrade", { plan });
            toast.success(`Succesfully transformed to ${plan} tier`);
            location.reload();
        } catch (err) {
            toast.error("Transformation failed");
        }
    }

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 flex items-center">
                        <Settings className="mr-3 h-8 w-8 text-slate-400" />
                        Enterprise Settings
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">Configure your global tenant settings and system preferences.</p>
                </div>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="bg-slate-100 border border-slate-200">
                    <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">General</TabsTrigger>
                    <TabsTrigger value="team" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">Company Team</TabsTrigger>
                    <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">Security</TabsTrigger>
                    <TabsTrigger value="billing" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">Billing</TabsTrigger>
                    <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">Notifications</TabsTrigger>
                    <TabsTrigger value="connectivity" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">Connectivity</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card className="bg-white border-slate-200 shadow-sm max-w-2xl">
                        <CardHeader>
                            <CardTitle className="text-slate-900 font-black flex items-center">
                                <Globe className="mr-2 h-5 w-5 text-sky-600" />
                                Identity & Localization
                            </CardTitle>
                            <CardDescription className="text-slate-500">Update your public enterprise profile and region data.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name" className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Organization Name</Label>
                                    <Input
                                        id="name"
                                        defaultValue={tenant?.name}
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
                                    <p className="text-[11px] text-slate-400 italic font-medium">Slugs are architectural constants and cannot be modified.</p>
                                </div>
                                <div className="pt-4">
                                    <Button type="submit" className="bg-slate-900 hover:bg-slate-950 text-white font-bold h-11 px-8 rounded-xl">Save Intelligence Update</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="team">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                            <div>
                                <h3 className="font-black text-slate-900">Corporate Directory</h3>
                                <p className="text-xs text-slate-500 font-medium">Manage employees and their access levels.</p>
                            </div>
                            <Button className="bg-slate-900 hover:bg-slate-950 font-bold gap-2" onClick={() => setIsAddUserOpen(true)}>
                                <UserPlus className="h-4 w-4" />
                                Onboard Member
                            </Button>
                        </div>

                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    {members.map((member) => (
                                        <div key={member.id} className="p-4 flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400">
                                                    {member.fullName[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900">{member.fullName}</div>
                                                    <div className="text-[11px] text-slate-400 font-medium">{member.email}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <Badge className={`font-black ${member.role === 'Owner' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    member.role === 'Manager' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        'bg-slate-50 text-slate-500 border-slate-100'
                                                    }`}>
                                                    {member.role.toUpperCase()}
                                                </Badge>

                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    {isOwner && member.email !== currentUser?.email && (
                                                        <>
                                                            <Select onValueChange={(val: any) => handleUpdateRole(member.id, val)}>
                                                                <SelectTrigger className="w-[120px] h-8 text-xs font-bold border-slate-200">
                                                                    <SelectValue placeholder="Change Role" />
                                                                </SelectTrigger>
                                                                <SelectContent>
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
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="security">
                    <Card className="bg-white border-slate-200 shadow-sm max-w-2xl">
                        <CardHeader>
                            <CardTitle className="text-slate-900 font-black flex items-center">
                                <Shield className="mr-2 h-5 w-5 text-emerald-600" />
                                Access Integrity
                            </CardTitle>
                            <CardDescription className="text-slate-500">Manage authentication protocols and audit logging.</CardDescription>
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
                                <CardDescription className="text-slate-500">Current tier and quota allocation metadata.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-6 rounded-2xl bg-slate-900 border-b-4 border-indigo-500 shadow-xl overflow-hidden relative">
                                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                                    <Badge className="mb-2 bg-indigo-600 text-white font-black">{billingInfo?.plan}</Badge>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                                        {billingInfo?.plan === 'Free' ? 'Sandbox Nucleus' : 'Enterprise Intelligence'}
                                    </h3>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Status: Active & Nominal</p>
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
                                        <span className="text-slate-500 font-bold uppercase tracking-tight text-[11px]">AI Neural Engine</span>
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
                                    Tier Transformation
                                </CardTitle>
                                <CardDescription className="text-slate-500">Instantly scale your enterprise resources.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {['Pro', 'Enterprise'].map(tier => (
                                    <div key={tier} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between hover:border-indigo-500 transition-all group cursor-pointer hover:bg-white">
                                        <div>
                                            <div className="text-sm font-black text-slate-900 tracking-tight">{tier} Configuration</div>
                                            <div className="text-[10px] text-slate-500 font-medium font-mono uppercase tracking-widest">Advanced Orchestration</div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="border-slate-200 text-slate-900 font-bold hover:bg-slate-900 hover:text-white transition-all px-6"
                                            onClick={() => handleUpgrade(tier)}
                                            disabled={billingInfo?.plan === tier}
                                        >
                                            {billingInfo?.plan === tier ? 'Active' : 'Transform'}
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
                                Event Delivery
                            </CardTitle>
                            <CardDescription className="text-slate-500">Configure how the system communicates mission updates.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-400 text-sm italic font-medium">Notification engine is currently running in 'Quiet' mode.</p>
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
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900">Onboard New Team Member</DialogTitle>
                        <DialogDescription className="text-slate-500">Add an employee to your organization and assign their functional access role.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddUser} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Full Legal Name</Label>
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
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Functional Role (RBAC)</Label>
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
                            <Button type="submit" className="bg-slate-900 hover:bg-black font-black px-8">Confirm Onboarding</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Password Reset Modal */}
            <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                <DialogContent className="max-w-sm bg-white">
                    <DialogHeader>
                        <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-2 mx-auto">
                            <Key className="h-6 w-6 text-amber-600" />
                        </div>
                        <DialogTitle className="text-xl font-black text-slate-900 text-center">New Access Key Generated</DialogTitle>
                        <DialogDescription className="text-center text-slate-500">Share this temporary key with the employee. They should change it upon login.</DialogDescription>
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
