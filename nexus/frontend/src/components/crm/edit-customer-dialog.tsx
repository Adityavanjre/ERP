"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const customerSchema = z.object({
    firstName: z.string().min(1, "First Name is required"),
    lastName: z.string().optional(),
    email: z.string().email("Invalid email address").min(1, "Email is required"),
    phone: z.string()
        .regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
        .optional()
        .or(z.literal("")),
    company: z.string().optional(),
    address: z.string().optional(),
    state: z.string().min(1, "State is required"),
    gstin: z.string()
        .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format. Leave empty if not applicable.")
        .optional()
        .or(z.literal("")),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface EditCustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    customer: any | null;
}

export function EditCustomerDialog({ open, onOpenChange, onSuccess, customer }: EditCustomerDialogProps) {
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
    } = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            company: "",
            address: "",
            state: "",
            gstin: "",
        },
    });

    useEffect(() => {
        if (customer) {
            reset({
                firstName: customer.firstName || "",
                lastName: customer.lastName || "",
                email: customer.email || "",
                phone: customer.phone || "",
                company: customer.company || "",
                address: customer.address || "",
                state: customer.state || "",
                gstin: customer.gstin || "",
            });
        }
    }, [customer, reset]);

    const onSubmit = async (data: CustomerFormValues) => {
        setLoading(true);
        try {
            await api.patch(`crm/customers/${customer.id}`, data);
            toast.success("Customer record updated successfully");
            onOpenChange(false);
            onSuccess?.();
            reset();
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
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="firstName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                First Name <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="firstName"
                                {...register("firstName")}
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                            {errors.firstName && <p className="text-xs text-rose-500 font-semibold ml-1">{errors.firstName.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lastName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Last Name
                            </Label>
                            <Input
                                id="lastName"
                                {...register("lastName")}
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
                                {...register("email")}
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                            {errors.email && <p className="text-xs text-rose-500 font-semibold ml-1">{errors.email.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Phone Number
                            </Label>
                            <Input
                                id="phone"
                                {...register("phone")}
                                placeholder="10 Digits"
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                            {errors.phone && <p className="text-xs text-rose-500 font-semibold ml-1">{errors.phone.message}</p>}
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="company" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                            Organization
                        </Label>
                        <Input
                            id="company"
                            {...register("company")}
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
                                {...register("gstin")}
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold uppercase"
                            />
                            {errors.gstin && <p className="text-xs text-rose-500 font-semibold ml-1">{errors.gstin.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="state" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                State (Tax Jurisdiction) <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="state"
                                {...register("state")}
                                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                            {errors.state && <p className="text-xs text-rose-500 font-semibold ml-1">{errors.state.message}</p>}
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
