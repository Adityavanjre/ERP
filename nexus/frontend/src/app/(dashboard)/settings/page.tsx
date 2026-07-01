"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Settings, Shield, CreditCard, Bell, Globe, Box, Cloud, Zap } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import Link from "next/link";
import { Badge } from "../../../components/ui/badge";
import { UserPlus, Key, Trash2, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { useAuth } from "../../../hooks/use-auth";
import { useUX } from "../../../components/providers/ux-provider";
import { ApiKeyManager } from "../../../components/system/api-key-manager";
import { Role } from "@nexus/shared";

// Use shared Role enum instead of local string literals

// REMOVED: BillingQuota interface - subscription system removed

// REMOVED: BillingInfo interface - subscription system removed

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
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    role: "Biller",
  });
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Company details fields
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [gstin, setGstin] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [authorizedSignatory, setAuthorizedSignatory] = useState("");

  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
    accountHolderName: "",
    isDefault: false,
  });
  const { user: currentUser } = useAuth();
  const { refreshMetadata } = useUX();
  const isOwner = currentUser?.role === "Owner";

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profileRes = await api.get("sync/metadata");
      setOrgName(profileRes.data?.tenant?.name || "");
      setLogoUrl(profileRes.data?.tenant?.logoUrl || "");
      setSlug(profileRes.data?.tenant?.slug || "");
      setAddress(profileRes.data?.tenant?.address || "");
      setState(profileRes.data?.tenant?.state || "");
      setGstin(profileRes.data?.tenant?.gstin || "");
      setPanNumber(profileRes.data?.tenant?.panNumber || "");
      setPhone(profileRes.data?.tenant?.phone || "");
      setCompanyEmail(profileRes.data?.tenant?.email || "");
      setAuthorizedSignatory(profileRes.data?.tenant?.authorizedSignatory || "");
      setBankAccounts(profileRes.data?.bankAccounts || []);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(
        apiError.isWakeup
          ? apiError.message || "Wakeup error"
          : "Failed to load settings. Please refresh.",
      );
    } finally {
      setLoading(false);
    }

    try {
      const usersRes = await api.get("users");
      setMembers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch {
      setMembers([]);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    void fetchSettings();
  }, [fetchSettings]);

  const handleAddUser = useCallback(
    async (e: React.FormEvent) => {
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
    },
    [newUser],
  );

  const handleUpdateRole = useCallback(async (userId: string, role: Role) => {
    try {
      await api.patch(`users/${userId}/role`, { role });
      toast.success("Role updated successfully");
      const res = await api.get("users");
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to update role");
    }
  }, []);

  const handleResetPassword = useCallback(async (userId: string) => {
    try {
      const res = await api.post(`users/${userId}/reset-password`);
      setTempPassword(res.data.temporaryPassword);
      setIsResetOpen(true);
      toast.success("Temporary password generated");
    } catch {
      toast.error("Failed to generate password");
    }
  }, []);

  const handleRemoveUser = useCallback(async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this user? This cannot be undone.",
      )
    )
      return;
    try {
      await api.delete(`users/${userId}`);
      toast.success("User removed from tenant");
      const res = await api.get("users");
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to remove user");
    }
  }, []);

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) { toast.error("Company name is required"); return; }
    try {
      await api.patch("system/tenant-profile", { name: orgName.trim() });
      toast.success("Company name updated");
      fetchSettings();
    } catch {
      toast.error("Failed to update company name");
    }
  }, [orgName, fetchSettings]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/jpg", "image/svg+xml"].includes(file.type)) {
      toast.error("Only PNG, JPG, or SVG files are accepted");
      return;
    }
    if (file.size > 10 * 1024 * 1024) { toast.error("Logo must be under 10MB"); return; }
    setLogoUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        await api.patch("system/tenant-profile", { logoUrl: base64 });
        setLogoUrl(base64);
        await refreshMetadata(); // Refresh sidebar logo
        toast.success("Logo uploaded successfully");
        setLogoUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to upload logo");
      setLogoUploading(false);
    }
  }, [refreshMetadata]);

  // ── Bank Account Handlers ──────────────────────────────────────

  const openAddBank = () => {
    setEditingBankId(null);
    setBankForm({ bankName: "", accountNumber: "", ifscCode: "", branch: "", accountHolderName: "", isDefault: bankAccounts.length === 0 });
    setIsBankDialogOpen(true);
  };

  const openEditBank = (acc: any) => {
    setEditingBankId(acc.id);
    setBankForm({ bankName: acc.bankName, accountNumber: acc.accountNumber, ifscCode: acc.ifscCode, branch: acc.branch, accountHolderName: acc.accountHolderName, isDefault: acc.isDefault });
    setIsBankDialogOpen(true);
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBankId) {
        await api.patch(`system/bank-accounts/${editingBankId}`, bankForm);
        toast.success("Bank account updated");
      } else {
        await api.post("system/bank-accounts", bankForm);
        toast.success("Bank account added");
      }
      setIsBankDialogOpen(false);
      const res = await api.get("system/bank-accounts");
      setBankAccounts(res.data?.data || []);
    } catch {
      toast.error("Failed to save bank account");
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm("Delete this bank account?")) return;
    try {
      await api.delete(`system/bank-accounts/${id}`);
      toast.success("Bank account removed");
      setBankAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error("Failed to delete bank account");
    }
  };

  // REMOVED: handleUpgrade function - subscription system removed

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <div className="flex-1 space-y-3 pt-2 md:pt-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center">
            <Settings className="mr-3 h-8 w-8 text-slate-400" />
            Settings
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            Manage your account, team, and billing preferences.
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-3">
        <TabsList className="bg-slate-100 border border-slate-200 p-1.5 rounded-2xl h-auto w-full flex flex-wrap justify-start overflow-x-auto snap-x">
          <TabsTrigger
            value="general"
            className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-xl px-4 md:px-6 py-2.5 font-bold transition-all snap-start"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-xl px-4 md:px-6 py-2.5 font-bold transition-all snap-start"
          >
            Company Team
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-xl px-4 md:px-6 py-2.5 font-bold transition-all snap-start"
          >
            Security
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-xl px-4 md:px-6 py-2.5 font-bold transition-all snap-start"
          >
            Billing
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-xl px-4 md:px-6 py-2.5 font-bold transition-all snap-start"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="connectivity"
            className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-xl px-4 md:px-6 py-2.5 font-bold transition-all snap-start"
          >
            Connectivity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          {/* Company Profile */}
          <Card className="bg-white border-slate-200 shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle className="text-slate-900 font-black flex items-center">
                <Globe className="mr-2 h-5 w-5 text-sky-600" />
                Company Profile
              </CardTitle>
              <CardDescription className="text-slate-500">
                Update your company name, logo, and workspace details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleUpdate} className="space-y-3">
                {/* Logo Upload */}
                <div className="grid gap-2">
                  <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Company Logo</Label>
                  <div className="flex items-center gap-4">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Company logo" className="h-14 w-14 object-contain rounded-xl border border-slate-200 bg-slate-50 p-1" />
                    ) : (
                      <div className="h-14 w-14 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs font-bold">LOGO</div>
                    )}
                    <div className="flex flex-col gap-1">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                        {logoUploading ? "Uploading..." : "Upload Logo"}
                        <input type="file" accept=".png,.jpg,.jpeg,.svg" onChange={handleLogoUpload} className="hidden" disabled={logoUploading} />
                      </label>
                      <span className="text-[10px] text-slate-400">PNG, JPG or SVG · max 10MB</span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Organization Name</Label>
                  <Input id="name" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500 h-10" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slug" className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Workspace Identifier (Slug)</Label>
                  <Input id="slug" value={slug} disabled className="bg-slate-100 border-slate-200 text-slate-400 font-mono h-10" />
                  <p className="text-[11px] text-slate-400 italic font-medium">This ID is fixed and cannot be changed.</p>
                </div>
                <div className="pt-4">
                  <Button type="submit" className="bg-slate-900 hover:bg-slate-950 text-white font-bold h-11 px-4 rounded-xl">Save Changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Company Details */}
          <Card className="bg-white border-slate-200 shadow-sm max-w-2xl mt-6">
            <CardHeader>
              <CardTitle className="text-slate-900 font-black flex items-center">
                <Shield className="mr-2 h-5 w-5 text-violet-600" />
                Company Details
              </CardTitle>
              <CardDescription className="text-slate-500">Tax registration, contact info, and authorized signatory.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleUpdate} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">GSTIN</Label>
                    <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" className="bg-slate-50 border-slate-200 text-slate-900 h-10 font-mono" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">PAN Number</Label>
                    <Input value={panNumber} onChange={(e) => setPanNumber(e.target.value)} placeholder="ABCDE1234F" className="bg-slate-50 border-slate-200 text-slate-900 h-10 font-mono" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Registered Address</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address with PIN code" className="bg-slate-50 border-slate-200 text-slate-900 h-10" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">State</Label>
                    <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Maharashtra" className="bg-slate-50 border-slate-200 text-slate-900 h-10" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="bg-slate-50 border-slate-200 text-slate-900 h-10" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Email</Label>
                    <Input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="info@company.com" className="bg-slate-50 border-slate-200 text-slate-900 h-10" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Authorized Signatory</Label>
                    <Input value={authorizedSignatory} onChange={(e) => setAuthorizedSignatory(e.target.value)} placeholder="Name for invoice signing" className="bg-slate-50 border-slate-200 text-slate-900 h-10" />
                  </div>
                </div>
                <div className="pt-4">
                  <Button type="submit" className="bg-slate-900 hover:bg-slate-950 text-white font-bold h-11 px-4 rounded-xl">Save Details</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Bank Accounts */}
          <Card className="bg-white border-slate-200 shadow-sm max-w-2xl mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-slate-900 font-black flex items-center">
                  <CreditCard className="mr-2 h-5 w-5 text-emerald-600" />
                  Bank Accounts
                </CardTitle>
                <CardDescription className="text-slate-500">Manage bank accounts shown on invoices.</CardDescription>
              </div>
              <Button onClick={openAddBank} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-3 rounded-xl text-xs">+ Add Account</Button>
            </CardHeader>
            <CardContent>
              {bankAccounts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No bank accounts added yet. Add one to display on invoices.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {bankAccounts.map((acc: any) => (
                    <div key={acc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{acc.bankName}</span>
                          {acc.isDefault && <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full">Default</span>}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-1">{acc.accountNumber} · IFSC: {acc.ifscCode}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{acc.branch} · {acc.accountHolderName}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-bold" onClick={() => openEditBank(acc)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteBank(acc.id)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modules & Features */}
          <Card className="bg-white border-slate-200 shadow-sm max-w-2xl mt-6">
            <CardHeader>
              <CardTitle className="text-slate-900 font-black flex items-center">
                <Box className="mr-2 h-5 w-5 text-emerald-600" />
                Modules & Features
              </CardTitle>
              <CardDescription className="text-slate-500">Configure which modules are enabled for your workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-3">Turn modules on or off at any time. Disabling a module hides it from your workspace but preserves all your data.</p>
              <Link href="/settings/modules">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-4 rounded-xl">Configure Modules</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <h3 className="font-black text-slate-900">Team Members</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Manage employees and their access levels.
                </p>
              </div>
              <Button
                className="bg-slate-900 hover:bg-slate-950 font-bold gap-2 w-full sm:w-auto justify-center"
                onClick={() => setIsAddUserOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Add Member
              </Button>
            </div>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 flex flex-col items-center justify-center gap-4">
                    <div className="h-8 w-8 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      Loading team...
                    </p>
                  </div>
                ) : error ? (
                  <div className="p-3 text-center space-y-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-black text-slate-900 uppercase tracking-tight">
                        Connection Error
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {error}
                      </p>
                    </div>
                    <Button
                      onClick={fetchSettings}
                      variant="outline"
                      className="font-bold border-slate-200"
                    >
                      Try Again
                    </Button>
                  </div>
                ) : members.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 font-medium text-sm">
                    No team members found.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {(members || []).map((member) => (
                      <div
                        key={member.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400">
                            {member.fullName ? member.fullName[0] : "?"}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {member.fullName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {member.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <Badge
                            className={`font-black ${
                              member.role === "Owner"
                                ? "bg-rose-50 text-rose-600 border-rose-100"
                                : member.role === "Manager"
                                  ? "bg-blue-50 text-blue-600 border-blue-100"
                                  : "bg-slate-50 text-slate-500 border-slate-100"
                            }`}
                          >
                            {member.role
                              ? typeof member.role === "string"
                                ? member.role.toUpperCase()
                                : "USER"
                              : "UNKNOWN"}
                          </Badge>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {isOwner && member.email !== currentUser?.email && (
                              <>
                                <Select
                                  onValueChange={(val: Role) =>
                                    handleUpdateRole(member.id, val)
                                  }
                                >
                                  <SelectTrigger className="w-[120px] h-8 text-xs font-bold border-slate-200">
                                    <SelectValue placeholder="Change Role" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white">
                                    {[
                                      "Owner",
                                      "Manager",
                                      "Biller",
                                      "Storekeeper",
                                      "Accountant",
                                      "CA",
                                    ].map((r) => (
                                      <SelectItem
                                        key={r}
                                        value={r}
                                        className="text-xs font-bold"
                                      >
                                        {r}
                                      </SelectItem>
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
              <CardDescription className="text-slate-500">
                Manage authentication methods and audit logging.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900 tracking-tight">
                    Multi-Factor Authentication
                  </div>
                  <div className="text-xs text-slate-500">
                    Add an extra layer of security to your account.
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-600 font-bold bg-white"
                >
                  Configure
                </Button>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900 tracking-tight">
                    Active Sessions
                  </div>
                  <div className="text-xs text-slate-500">
                    Monitor and manage your active system sessions.
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-600 font-bold bg-white"
                >
                  View Active
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REMOVED: Billing tab content - subscription system removed */}
        <TabsContent value="billing">
          <Card className="bg-white border-slate-200 shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle className="text-slate-900 font-black flex items-center">
                <CreditCard className="mr-2 h-5 w-5 text-amber-600" />
                Subscription Management
              </CardTitle>
              <CardDescription className="text-slate-500">
                Subscription and billing are managed externally.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-sm">
                Your subscription is managed by your administrator. Please contact support for any billing-related inquiries.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-white border-slate-200 shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle className="text-slate-900 font-black flex items-center">
                <Bell className="mr-2 h-5 w-5 text-rose-600" />
                Notifications
              </CardTitle>
              <CardDescription className="text-slate-500">
                Choose how you want to receive alerts and updates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm italic font-medium">
                Notifications are currently turned off.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connectivity">
          <div className="max-w-4xl space-y-3">
            <ApiKeyManager />
            
            <Card className="bg-white border-blue-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b border-blue-100">
                <CardTitle className="text-blue-900 font-black flex items-center">
                  <Cloud className="mr-2 h-5 w-5 text-blue-600" />
                  Migrate to Klypso Cloud
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Upgrade your local peer-to-peer setup to a fully managed cloud workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="text-sm text-slate-600 mb-3">
                  Ready to scale? This process will safely copy your local SQLite database to our secure cloud infrastructure. You'll gain global access, automated backups, and higher performance without losing any of your existing data.
                </p>
                <Button disabled className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-4 rounded-xl opacity-80">
                  Begin Cloud Migration
                </Button>
                <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest">
                  * Coming soon in the next major update
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add User Modal */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">
              Onboard New Team Member
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Add an employee to your organization and assign their functional
              access role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-3 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Full Name
              </Label>
              <Input
                placeholder="e.g. Anita Biller"
                className="bg-slate-50 border-slate-200 h-11"
                required
                value={newUser.fullName}
                onChange={(e) =>
                  setNewUser({ ...newUser, fullName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Professional Email
              </Label>
              <Input
                type="email"
                placeholder="name@woodcraft.com"
                className="bg-slate-50 border-slate-200 h-11"
                required
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Role
              </Label>
              <Select
                value={newUser.role}
                onValueChange={(val: Role) =>
                  setNewUser({ ...newUser, role: val })
                }
              >
                <SelectTrigger className="bg-slate-50 border-slate-200 h-11 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Owner" className="font-bold">
                    Owner (Full System Access)
                  </SelectItem>
                  <SelectItem value="Manager" className="font-bold">
                    Manager (Operational Admin)
                  </SelectItem>
                  <SelectItem value="Biller" className="font-bold">
                    Biller (Checkout & Sales)
                  </SelectItem>
                  <SelectItem value="Storekeeper" className="font-bold">
                    Storekeeper (Stock & Logistics)
                  </SelectItem>
                  <SelectItem value="Accountant" className="font-bold">
                    Accountant (Finance & Audit)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                className="font-bold"
                onClick={() => setIsAddUserOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-slate-900 hover:bg-black font-black px-4"
              >
                Add Member
              </Button>
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
            <DialogTitle className="text-xl font-black text-slate-900 text-center">
              Temporary Password
            </DialogTitle>
            <DialogDescription className="text-center text-slate-500">
              Share this temporary password with the employee. They should
              change it after logging in.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 flex flex-col items-center justify-center gap-4">
            <div className="text-2xl font-black font-mono tracking-widest bg-slate-100 p-4 rounded-xl border-b-2 border-slate-200 w-full text-center text-slate-900">
              {tempPassword}
            </div>
            <Button
              className="w-full font-bold bg-slate-900"
              onClick={async () => {
                await navigator.clipboard.writeText(tempPassword || "");
                toast.success("Key copied to clipboard");
              }}
            >
              Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Bank Account Dialog */}
      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
        <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">
              {editingBankId ? "Edit Bank Account" : "Add Bank Account"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              This account details will appear on your invoices.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveBank} className="space-y-3 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bank Name</Label>
              <Input placeholder="e.g. HDFC Bank" className="bg-slate-50 border-slate-200 h-11" required value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Account Number</Label>
                <Input placeholder="1234567890" className="bg-slate-50 border-slate-200 h-11 font-mono" required value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">IFSC Code</Label>
                <Input placeholder="HDFC0001234" className="bg-slate-50 border-slate-200 h-11 font-mono" required value={bankForm.ifscCode} onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Branch</Label>
              <Input placeholder="e.g. Andheri West, Mumbai" className="bg-slate-50 border-slate-200 h-11" required value={bankForm.branch} onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Account Holder Name</Label>
              <Input placeholder="As per bank records" className="bg-slate-50 border-slate-200 h-11" required value={bankForm.accountHolderName} onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="isDefault" checked={bankForm.isDefault} onChange={(e) => setBankForm({ ...bankForm, isDefault: e.target.checked })} className="rounded" />
              <Label htmlFor="isDefault" className="text-sm font-bold text-slate-700">Set as default account</Label>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" className="font-bold" onClick={() => setIsBankDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-black font-black px-4">{editingBankId ? "Update" : "Add Account"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

