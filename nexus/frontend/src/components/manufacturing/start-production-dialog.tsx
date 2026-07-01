"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { Play, Loader2, Warehouse, Plus } from "lucide-react";
import { InlineCreateWarehouseDialog } from "../shared/inline-create-warehouse-dialog";

interface WarehouseItem {
  id: string;
  name: string;
}

interface MachineItem {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface WorkOrderItem {
  id: string;
  orderNumber: string;
}

interface StartProductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: WorkOrderItem | null;
  onSuccess: () => void;
}

export function StartProductionDialog({
  open,
  onOpenChange,
  workOrder,
  onSuccess,
}: StartProductionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [machines, setMachines] = useState<MachineItem[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [isWarehouseCreateOpen, setIsWarehouseCreateOpen] = useState(false);

  const fetchInitialData = async () => {
    try {
      const [wRes, mRes] = await Promise.all([
        api.get<WarehouseItem[]>("inventory/warehouses"),
        api.get<MachineItem[]>("manufacturing/machines"),
      ]);
      setWarehouses(wRes.data || []);
      setMachines(mRes.data || []);

      if (wRes.data && wRes.data.length > 0) {
        setSelectedWarehouseId(wRes.data[0].id);
      }
    } catch {
      toast.error("Failed to load initial data");
    }
  };

  useEffect(() => {
    if (open) {
      void fetchInitialData();
    }
  }, [open]);

  const handleStart = async () => {
    if (!workOrder) return;
    // Warehouse is optional — production can proceed without selecting one

    try {
      setLoading(true);
      await api.post(`manufacturing/work-orders/${workOrder.id}/start`, {
        warehouseId: selectedWarehouseId || undefined,
        machineId: selectedMachineId || undefined,
        idempotencyKey: `start-${workOrder.id}-${Date.now()}`,
      });
      toast.success("Production started. Materials moved to WIP.");
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message || "Failed to start production",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!workOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="bg-amber-500 p-4 text-white relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Play className="h-24 w-24" />
          </div>
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-3xl font-black tracking-tight">
              Start Production
            </DialogTitle>
            <DialogDescription className="text-amber-500 bg-white/90 px-3 py-1 rounded-full w-fit font-black text-[10px] uppercase tracking-widest mt-2">
              WO-{workOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-3 space-y-3">
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                <Warehouse className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Source Warehouse
                </p>
                <p className="text-sm font-bold text-slate-700">
                  Select where to draw raw materials from
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Warehouse Location (Optional)
                </Label>
                <button
                  type="button"
                  onClick={() => setIsWarehouseCreateOpen(true)}
                  className="text-[9px] font-bold text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> New Warehouse
                </button>
              </div>
              <Select
                value={selectedWarehouseId}
                onValueChange={setSelectedWarehouseId}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50 font-semibold focus:ring-amber-500 text-slate-700">
                  <SelectValue placeholder="Select Warehouse (Optional)" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100">
                  <SelectItem value="" className="rounded-xl text-slate-400">No warehouse</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id} className="rounded-xl">
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Assigned Machine (Optional)
              </Label>
              <Select
                value={selectedMachineId}
                onValueChange={setSelectedMachineId}
              >
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50 font-semibold focus:ring-amber-500 text-slate-700">
                  <SelectValue placeholder="Select Machine" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100">
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="rounded-xl">
                      {m.name} ({m.code}) - {m.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100">
            <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
              <strong>Note:</strong> Starting production will automatically
              deduct the required raw materials from the selected warehouse and
              move them into the virtual <strong>Work-in-Progress (WIP)</strong>{" "}
              bin.
            </p>
          </div>
        </div>

        <DialogFooter className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold text-slate-400"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            disabled={loading}
            className="rounded-xl bg-slate-900 hover:bg-amber-600 text-white font-black px-4 shadow-xl shadow-slate-900/10 h-12 transition-all"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Confirm & Start"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      <InlineCreateWarehouseDialog
        open={isWarehouseCreateOpen}
        onOpenChange={setIsWarehouseCreateOpen}
        onSuccess={(newWarehouse) => {
          setWarehouses((prev) => [...prev, newWarehouse]);
          setSelectedWarehouseId(newWarehouse.id);
        }}
      />
    </Dialog>
  );
}
