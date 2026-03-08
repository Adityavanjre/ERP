
"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface CreateAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export function CreateAccountDialog({ open, onOpenChange, onSuccess }: CreateAccountDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        type: "Asset" as AccountType,
    });

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        const name = formData.name.trim();
        const code = formData.code.trim();

        if (!name || !code || !formData.type) {
            toast.error("Please fill in all required fields (no whitespace only)");
            return;
        }

        setLoading(true);
        try {
            await api.post("accounting/accounts", { ...formData, name, code });
            toast.success(`Account "${formData.name}" created successfully`);
            setFormData({ name: "", code: "", type: "Asset" });
            onOpenChange(false);
            onSuccess?.();
        } catch (error: unknown) {
            const err = error as ApiError;
            toast.error(err.response?.data?.message || "Failed to create account");
        } finally {
            setLoading(false);
        }
    }, [formData, onOpenChange, onSuccess]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Create New Account</DialogTitle>
                    <DialogDescription>
                        Add a new account to organize your finances. Common examples: Petty Cash, Office Rent, Salary Expense, Sales Revenue.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="font-semibold">
                                Account Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder="e.g., Petty Cash, Office Supplies"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="h-11"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="code" className="font-semibold">
                                Account Code <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="code"
                                placeholder="e.g., 1003, 5104"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                                className="h-11"
                            />
                            <p className="text-xs text-slate-500">
                                A unique code to identify this account
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="type" className="font-semibold">
                                Account Type <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value: AccountType) => setFormData({ ...formData, type: value })}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select account type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Asset">Asset</SelectItem>
                                    <SelectItem value="Liability">Liability</SelectItem>
                                    <SelectItem value="Equity">Equity</SelectItem>
                                    <SelectItem value="Revenue">Revenue</SelectItem>
                                    <SelectItem value="Expense">Expense</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600">
                            {loading ? "Creating..." : "Create Account"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
