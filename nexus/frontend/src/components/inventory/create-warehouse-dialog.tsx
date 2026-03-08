"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface CreateWarehouseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export function CreateWarehouseDialog({ open, onOpenChange, onSuccess }: CreateWarehouseDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        location: "",
        manager: ""
    });

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name) {
            toast.error("Warehouse name is required");
            return;
        }

        setLoading(true);
        try {
            await api.post("inventory/warehouses", formData);
            toast.success("Warehouse created successfully");
            setFormData({ name: "", location: "", manager: "" });
            onOpenChange(false);
            onSuccess?.();
        } catch (error: unknown) {
            const err = error as ApiError;
            toast.error(err.response?.data?.message || "Failed to create warehouse");
        } finally {
            setLoading(false);
        }
    }, [formData, onOpenChange, onSuccess]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-[425px] rounded-[32px] border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Add Warehouse</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Create a new storage location for your stock and distribution.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Warehouse Name <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder="Main Warehouse"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Location Address
                            </Label>
                            <Input
                                id="location"
                                placeholder="123 Industrial Area, Phase II"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="manager" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Warehouse Manager
                            </Label>
                            <Input
                                id="manager"
                                placeholder="John Doe"
                                value={formData.manager}
                                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                                className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="rounded-2xl font-bold h-12 px-6"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 px-8 font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Warehouse"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
