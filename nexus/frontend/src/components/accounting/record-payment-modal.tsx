
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RecordPaymentModalProps {
    invoice: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function RecordPaymentModal({ invoice, isOpen, onClose, onSuccess }: RecordPaymentModalProps) {
    const [amount, setAmount] = useState<string>("");
    const [mode, setMode] = useState<string>("Bank");
    const [reference, setReference] = useState("");
    const [loading, setLoading] = useState(false);

    // Calc outstanding
    const outstanding = Number(invoice?.totalAmount || 0) - Number(invoice?.amountPaid || 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        if (Number(amount) > outstanding) {
            toast.error(`Amount exceeds outstanding balance of ${outstanding}`);
            return;
        }

        setLoading(true);
        try {
            await api.post("/accounting/payments", {
                customerId: invoice.customerId,
                invoiceId: invoice.id,
                amount: Number(amount),
                mode,
                reference,
                date: new Date().toISOString()
            });
            toast.success("Payment recorded successfully");
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to record payment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#09090b] text-white border-white/10">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Record a payment for Invoice #{invoice?.invoiceNumber}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Outstanding Balance</Label>
                        <div className="text-2xl font-bold text-white">
                            ₹{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Payment Amount</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder={outstanding.toString()}
                                className="bg-white/5 border-white/10 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mode">Mode</Label>
                            <Select value={mode} onValueChange={setMode}>
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                    <SelectValue placeholder="Select mode" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reference">Reference / Transaction ID</Label>
                        <Input
                            id="reference"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="e.g. UTR12345678"
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} className="border-white/10 text-white hover:bg-white/5">Cancel</Button>
                        <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Payment
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
