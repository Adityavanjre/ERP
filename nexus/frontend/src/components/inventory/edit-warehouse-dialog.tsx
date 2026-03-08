"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface MinimalWarehouse {
    id: string;
    name: string;
    location?: string;
    manager?: string;
}

interface EditWarehouseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouse: MinimalWarehouse | null;
    onSuccess?: () => void;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export function EditWarehouseDialog({ open, onOpenChange, warehouse, onSuccess }: EditWarehouseDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        location: "",
        manager: ""
    });

    useEffect(() => {
        if (warehouse) {
            setFormData({
                name: warehouse.name || "",
                location: warehouse.location || "",
                manager: warehouse.manager || ""
            });
        }
    }, [warehouse, open]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !warehouse) {
            toast.error("Warehouse name is required");
            return;
        }

        setLoading(true);
        try {
            await api.patch(`inventory/warehouses/${warehouse.id}`, formData);
            toast.success("Warehouse updated successfully");
            onOpenChange(false);
            onSuccess?.();
        } catch (error: unknown) {
            const err = error as ApiError;
            toast.error(err.response?.data?.message || "Failed to update warehouse");
        } finally {
            setLoading(false);
        }
    }, [formData, warehouse, onOpenChange, onSuccess]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-[425px] rounded-[32px] border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Edit Warehouse</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Update storage information for {warehouse?.name}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Warehouse Name <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder="Main Factory Warehouse"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Location / Address
                            </Label>
                            <Input
                                id="location"
                                placeholder="Industrial Area Phase 2, Mumbai"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="manager" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Warehouse Manager
                            </Label>
                            <Input
                                id="manager"
                                placeholder="Enter manager name"
                                value={formData.manager}
                                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
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
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-8 font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
