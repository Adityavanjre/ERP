"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface EditCustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    customer: any | null;
}

export function EditCustomerDialog({ open, onOpenChange, onSuccess, customer }: EditCustomerDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        address: "",
        state: "",
        gstin: ""
    });

    useEffect(() => {
        if (customer) {
            setFormData({
                firstName: customer.firstName || "",
                lastName: customer.lastName || "",
                email: customer.email || "",
                phone: customer.phone || "",
                company: customer.company || "",
                address: customer.address || "",
                state: customer.state || "",
                gstin: customer.gstin || ""
            });
        }
    }, [customer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.firstName || !formData.email) {
            toast.error("First Name and Email are required");
            return;
        }

        setLoading(true);
        try {
            await api.patch(`crm/customers/${customer.id}`, formData);
            toast.success("Customer record updated successfully");
            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update customer");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-[32px] border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Edit Strategic Relation</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Modify customer profile and business details.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="firstName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                First Name <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="firstName"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                required
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lastName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Last Name
                            </Label>
                            <Input
                                id="lastName"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Business Email <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Phone Number
                            </Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="company" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                            Organization
                        </Label>
                        <Input
                            id="company"
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="gstin" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                GSTIN
                            </Label>
                            <Input
                                id="gstin"
                                value={formData.gstin}
                                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold uppercase"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="state" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                State (Tax Jurisdiction)
                            </Label>
                            <Input
                                id="state"
                                value={formData.state}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl font-bold h-11 px-6"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-11 px-8 font-black uppercase tracking-widest shadow-lg shadow-amber-500/20"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
