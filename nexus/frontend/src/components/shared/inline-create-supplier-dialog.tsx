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

interface InlineCreateSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newSupplier: any) => void;
}

export function InlineCreateSupplierDialog({
  open,
  onOpenChange,
  onSuccess,
}: InlineCreateSupplierDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    state: "",
    gstin: "",
    pan: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) {
      errs.name = "Supplier name is required";
    }
    if (formData.phone.trim() && !/^\d+$/.test(formData.phone.trim())) {
      errs.phone = "Phone number must contain digits only";
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = "Invalid email format";
    }
    if (formData.gstin.trim() && formData.gstin.trim().length !== 15) {
      errs.gstin = "GSTIN must be exactly 15 characters";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        contactName: formData.contactName.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        state: formData.state.trim() || undefined,
        gstin: formData.gstin.trim() || undefined,
        pan: formData.pan.trim() || undefined,
      };

      const res = await api.post("purchases/suppliers", payload);
      toast.success("Supplier created successfully");
      setFormData({
        name: "",
        contactName: "",
        phone: "",
        email: "",
        address: "",
        state: "",
        gstin: "",
        pan: "",
      });
      onOpenChange(false);
      onSuccess?.(res.data?.data || res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create supplier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-11/12 sm:max-w-[480px] rounded-[32px] border-none shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
            Create Supplier Inline
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Register a new vendor on-the-spot. Optional fields can be left blank.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-1.5 pt-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Supplier Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Marble Cladding Ltd"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-[10px] text-red-500 font-bold">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Contact Person</Label>
              <Input
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="e.g. Ramesh"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && <p className="text-[10px] text-red-500 font-bold">{errors.phone}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. vendor@example.com"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-[10px] text-red-500 font-bold">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. 45 Industrial Area"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">State</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Rajasthan"
              />
            </div>
            <div className="col-span-1 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">GSTIN</Label>
              <Input
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="GSTIN"
                className={errors.gstin ? "border-red-500" : ""}
              />
              {errors.gstin && <p className="text-[10px] text-red-500 font-bold">{errors.gstin}</p>}
            </div>
            <div className="col-span-1 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">PAN</Label>
              <Input
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                placeholder="PAN No."
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
