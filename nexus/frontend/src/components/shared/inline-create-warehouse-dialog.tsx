"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface InlineCreateWarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newWarehouse: Record<string, unknown>) => void;
}

export function InlineCreateWarehouseDialog({
  open,
  onOpenChange,
  onSuccess,
}: InlineCreateWarehouseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    manager: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Warehouse name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("inventory/warehouses", {
        name: formData.name.trim(),
        location: formData.location.trim() || undefined,
        manager: formData.manager.trim() || undefined,
      });
      toast.success("Warehouse created successfully");
      setFormData({ name: "", location: "", manager: "" });
      onOpenChange(false);
      onSuccess?.(res.data?.data || res.data);
    } catch (error: Record<string, unknown>) {
      toast.error(error.response?.data?.message || "Failed to create warehouse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-11/12 sm:max-w-[420px] rounded-[32px] border-none shadow-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
            Create Warehouse Inline
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Add a new storage location on-the-spot.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Warehouse Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Sector-4 Stockyard"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Location Address</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Jaipur Road, Industrial Area"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Manager Name</Label>
            <Input
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              placeholder="e.g. Mr. Rajesh Sharma"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Warehouse"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
