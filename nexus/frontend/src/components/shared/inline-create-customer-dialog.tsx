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

interface InlineCreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newCustomer: any) => void;
}

export function InlineCreateCustomerDialog({
  open,
  onOpenChange,
  onSuccess,
}: InlineCreateCustomerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    company: "",
    phone: "",
    email: "",
    address: "",
    state: "",
    gstin: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.firstName.trim()) {
      errs.firstName = "First name is required";
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
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim() || undefined,
        company: formData.company.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        state: formData.state.trim() || undefined,
        gstin: formData.gstin.trim() || undefined,
      };

      const res = await api.post("crm/customers", payload);
      
      // After successful creation, clear cache to force refresh
      // This ensures the new customer appears immediately in list views
      if (window && typeof window !== 'undefined') {
        // Signal that customer data is stale and needs refresh
        localStorage.setItem('k_customer_data_stale', 'true');
        localStorage.removeItem('k_customer_data_stale'); // Clear immediately to use as signal
      }
      
      toast.success("Customer created successfully");
      setFormData({
        firstName: "",
        lastName: "",
        company: "",
        phone: "",
        email: "",
        address: "",
        state: "",
        gstin: "",
      });
      onOpenChange(false);
      onSuccess?.(res.data?.data || res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-11/12 sm:max-w-[480px] rounded-[32px] border-none shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
            Create Customer Inline
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Add a new customer on-the-spot. Optional fields can be left blank.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">First Name *</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. John"
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && <p className="text-[10px] text-red-500 font-bold">{errors.firstName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Last Name</Label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Company</Label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="e.g. Acme Corp"
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
              placeholder="e.g. john@example.com"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-[10px] text-red-500 font-bold">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. 123 Street Address"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">State / Province</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. Maharashtra"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">GSTIN</Label>
              <Input
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="15-digit GSTIN"
                className={errors.gstin ? "border-red-500" : ""}
              />
              {errors.gstin && <p className="text-[10px] text-red-500 font-bold">{errors.gstin}</p>}
            </div>
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
