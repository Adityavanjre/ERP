"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const supplierSchema = z.object({
    name: z.string().min(1, "Supplier name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
    category: z.string().optional(),
    address: z.string().optional()
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface CreateSupplierDialogProps {
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

export function CreateSupplierDialog({ open, onOpenChange, onSuccess }: CreateSupplierDialogProps) {
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierFormData>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            category: "",
            address: ""
        }
    });

    const onSubmit = useCallback(async (data: SupplierFormData) => {
        setLoading(true);
        try {
            await api.post("purchases/suppliers", data);
            toast.success("Supplier added successfully");
            reset();
            onOpenChange(false);
            onSuccess?.();
        } catch (error: unknown) {
            const err = error as ApiError;
            toast.error(err.response?.data?.message || "Failed to add supplier");
        } finally {
            setLoading(false);
        }
    }, [reset, onOpenChange, onSuccess]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-[425px] rounded-[32px] border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Add Supplier</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Register a new vendor or supplier for your procurement needs.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <div className="space-y-3">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Supplier Name <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder="Grand Logistics Ltd"
                                {...register("name")}
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                            {errors.name && <p className="text-xs text-rose-500 font-semibold ml-1">{errors.name.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    Email <span className="text-rose-500">*</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="vendor@example.com"
                                    {...register("email")}
                                    className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                                />
                                {errors.email && <p className="text-xs text-rose-500 font-semibold ml-1">{errors.email.message}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    Phone <span className="text-rose-500">*</span>
                                </Label>
                                <Input
                                    id="phone"
                                    placeholder="9876543210"
                                    {...register("phone")}
                                    className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                                />
                                {errors.phone && <p className="text-xs text-rose-500 font-semibold ml-1">{errors.phone.message}</p>}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Category
                            </Label>
                            <Input
                                id="category"
                                placeholder="Raw Materials / Electronics"
                                {...register("category")}
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
                                {...register("address")}
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
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Supplier"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
