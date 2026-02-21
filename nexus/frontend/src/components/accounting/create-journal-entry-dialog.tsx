"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface CreateJournalEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    accounts: any[];
}

interface JournalLine {
    accountId: string;
    type: "Debit" | "Credit";
    amount: string;
}

export function CreateJournalEntryDialog({ open, onOpenChange, onSuccess, accounts }: CreateJournalEntryDialogProps) {
    const [loading, setLoading] = useState(false);
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [lines, setLines] = useState<JournalLine[]>([
        { accountId: "", type: "Debit", amount: "" },
        { accountId: "", type: "Credit", amount: "" },
    ]);

    const addLine = () => {
        setLines([...lines, { accountId: "", type: "Debit", amount: "" }]);
    };

    const removeLine = (index: number) => {
        if (lines.length > 2) {
            setLines(lines.filter((_, i) => i !== index));
        }
    };

    const updateLine = (index: number, field: keyof JournalLine, value: string) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };
        setLines(newLines);
    };

    const getTotalDebits = () => lines.filter(l => l.type === "Debit").reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
    const getTotalCredits = () => lines.filter(l => l.type === "Credit").reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
    const isBalanced = () => Math.abs(getTotalDebits() - getTotalCredits()) < 0.01;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!description) {
            toast.error("Please add a description");
            return;
        }

        if (lines.some(l => !l.accountId || !l.amount || parseFloat(l.amount) <= 0)) {
            toast.error("All lines must have an account and valid amount");
            return;
        }

        if (!isBalanced()) {
            toast.error("Debits and Credits must balance");
            return;
        }

        setLoading(true);
        try {
            // Create journal entry
            const journalData = {
                date,
                description,
                entries: lines.map(l => ({
                    accountId: l.accountId,
                    type: l.type,
                    amount: parseFloat(l.amount),
                    description
                }))
            };

            await api.post("accounting/journal-entries", journalData);
            toast.success("Journal entry created successfully");
            setDescription("");
            setDate(new Date().toISOString().split('T')[0]);
            setLines([
                { accountId: "", type: "Debit", amount: "" },
                { accountId: "", type: "Credit", amount: "" },
            ]);
            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to create journal entry");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Create Journal Entry</DialogTitle>
                    <DialogDescription>
                        Record a manual journal entry. Every debit must have an equal credit (double-entry bookkeeping). Use this for corrections, adjustments, or transactions not covered by invoices/payments.
                    </DialogDescription>

                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="date" className="font-semibold">
                                    Date <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                    className="h-11"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description" className="font-semibold">
                                Description <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="description"
                                placeholder="e.g., Adjustment for inventory variance"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                rows={2}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="font-semibold">Journal Lines</Label>
                                <Button type="button" size="sm" variant="outline" onClick={addLine}>
                                    <Plus className="h-3 w-3 mr-1" /> Add Line
                                </Button>
                            </div>

                            {lines.map((line, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-lg">
                                    <div className="col-span-5">
                                        <Label className="text-xs">Account</Label>
                                        <select
                                            value={line.accountId}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateLine(index, "accountId", e.target.value)}

                                            className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm"
                                            required
                                        >
                                            <option value="">Select account...</option>
                                            {accounts.map((acc) => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.code} - {acc.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-xs">Type</Label>
                                        <select
                                            value={line.type}
                                            onChange={(e) => updateLine(index, "type", e.target.value as "Debit" | "Credit")}
                                            className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm"
                                        >
                                            <option value="Debit">Debit</option>
                                            <option value="Credit">Credit</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-xs">Amount</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={line.amount}
                                            onChange={(e) => updateLine(index, "amount", e.target.value)}
                                            placeholder="0.00"
                                            required
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        {lines.length > 2 && (
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => removeLine(index)}
                                                className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-900 text-white rounded-lg font-bold">
                                <div>
                                    <div className="text-xs opacity-70">Total Debits</div>
                                    <div className="text-lg">₹{getTotalDebits().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div>
                                    <div className="text-xs opacity-70">Total Credits</div>
                                    <div className="text-lg">₹{getTotalCredits().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                </div>
                            </div>

                            {!isBalanced() && getTotalDebits() > 0 && getTotalCredits() > 0 && (
                                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                    ⚠️ Entry is not balanced. Difference: ₹{Math.abs(getTotalDebits() - getTotalCredits()).toFixed(2)}
                                </div>
                            )}
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
                        <Button type="submit" disabled={loading || !isBalanced()} className="bg-amber-500 hover:bg-amber-600">
                            {loading ? "Creating..." : "Create Entry"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
