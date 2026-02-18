"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface EditSupplierDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier: any;
    onSuccess?: () => void;
}

export function EditSupplierDialog({ open, onOpenChange, supplier, onSuccess }: EditSupplierDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        category: "",
        address: ""
    });

    useEffect(() => {
        if (supplier) {
            setFormData({
                name: supplier.name || "",
                email: supplier.email || "",
                phone: supplier.phone || "",
                category: supplier.category || "",
                address: supplier.address || ""
            });
        }
    }, [supplier, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name) {
            toast.error("Supplier name is required");
            return;
        }

        setLoading(true);
        try {
            await api.patch(`purchases/suppliers/${supplier.id}`, formData);
            toast.success("Supplier updated successfully");
            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update supplier");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-[32px] border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Edit Supplier</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Update supplier information for {supplier?.name}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-3">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Supplier Name <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder="Grand Logistics Ltd"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="vendor@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    Phone
                                </Label>
                                <Input
                                    id="phone"
                                    placeholder="+91 9876543210"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Category
                            </Label>
                            <Input
                                id="category"
                                placeholder="Raw Materials / Electronics"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Address
                            </Label>
                            <Input
                                id="address"
                                placeholder="Full business address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-8 font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
