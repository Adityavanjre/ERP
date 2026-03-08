import React, { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CheckCircle2, Factory, User } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface MinimalWorkOrder {
    id: string;
    orderNumber: string;
    quantity: number;
    bom?: {
        product?: {
            name: string;
        };
    };
}

interface Machine {
    id: string;
    name: string;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export function CompleteWorkOrderDialog({
    workOrder,
    refreshData,
    children,
}: {
    workOrder: MinimalWorkOrder;
    refreshData: () => void;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Real-world defaults
    const [producedQuantity, setProducedQuantity] = useState(workOrder.quantity.toString());
    const [scrapQuantity, setScrapQuantity] = useState("0");
    const [machineId, setMachineId] = useState("");
    const [machineTimeHours, setMachineTimeHours] = useState("0");
    const [operatorName, setOperatorName] = useState("");
    const [machines, setMachines] = useState<Machine[]>([]);

    const fetchMachines = useCallback(async () => {
        try {
            const res = await api.get("manufacturing/machines");
            setMachines(res.data || []);
        } catch {
            // Ignore fetch errors for machines
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchMachines();
        }
    }, [open, fetchMachines]);

    const handleComplete = useCallback(async () => {
        try {
            setLoading(true);

            const prodQty = Number(producedQuantity);
            const scrQty = Number(scrapQuantity);

            if (isNaN(prodQty) || prodQty < 0) {
                toast.error("Invalid produced quantity.");
                return;
            }
            if (isNaN(scrQty) || scrQty < 0) {
                toast.error("Invalid scrap quantity.");
                return;
            }

            await api.post(`/manufacturing/work-orders/${workOrder.id}/complete`, {
                producedQuantity: prodQty,
                scrapQuantity: scrQty,
                machineId: machineId || undefined,
                machineTimeHours: Number(machineTimeHours),
                operatorName: operatorName
            });

            toast.success("Work order completed successfully.");
            setOpen(false);
            refreshData();
        } catch (err: unknown) {
            const error = err as ApiError;
            toast.error(error.response?.data?.message || "Failed to complete work order");
        } finally {
            setLoading(false);
        }
    }, [producedQuantity, scrapQuantity, machineId, machineTimeHours, operatorName, workOrder.id, refreshData]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Factory className="h-5 w-5 text-emerald-600" />
                        Complete Work Order
                    </DialogTitle>
                    <DialogDescription>
                        Record the actual production yield for WO-{workOrder.orderNumber}.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Product Details</div>
                        <div className="font-medium text-slate-900">{workOrder.bom?.product?.name}</div>
                        <div className="text-xs text-slate-500 mt-1">Target Quantity: {workOrder.quantity} Units</div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="producedQuantity" className="text-slate-700 font-bold">
                            Produced Quantity (Good Yield)
                        </Label>
                        <Input
                            id="producedQuantity"
                            type="number"
                            value={producedQuantity}
                            onChange={(e) => setProducedQuantity(e.target.value)}
                            min="0"
                            className="font-mono text-lg"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">The actual amount of finished goods moving to inventory.</p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="scrapQuantity" className="text-slate-700 font-bold">
                            Scrap Quantity (Defects / Waste)
                        </Label>
                        <Input
                            id="scrapQuantity"
                            type="number"
                            value={scrapQuantity}
                            onChange={(e) => setScrapQuantity(e.target.value)}
                            min="0"
                            className="font-mono text-lg text-red-600"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Materials consumed but did not result in finished goods.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label className="text-slate-700 font-bold">Machine</Label>
                            <Select value={machineId} onValueChange={setMachineId}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select machine" />
                                </SelectTrigger>
                                <SelectContent>
                                    {machines.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-slate-700 font-bold text-xs uppercase">Run Time (Hrs)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={machineTimeHours}
                                onChange={(e) => setMachineTimeHours(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-slate-700 font-bold">Operator Name</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                className="pl-9"
                                placeholder="Employee Name"
                                value={operatorName}
                                onChange={e => setOperatorName(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleComplete}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                    >
                        {loading ? <LoadingSpinner text="Processing..." /> : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Finalize Production
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
