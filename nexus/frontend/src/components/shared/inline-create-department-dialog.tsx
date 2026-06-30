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

interface InlineCreateDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newDept: any) => void;
}

export function InlineCreateDepartmentDialog({
  open,
  onOpenChange,
  onSuccess,
}: InlineCreateDepartmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Department name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("hr/departments", { name: name.trim() });
      toast.success("Department created successfully");
      setName("");
      onOpenChange(false);
      onSuccess?.(res.data?.data || res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-11/12 sm:max-w-[400px] rounded-[32px] border-none shadow-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
            Create Department Inline
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Add a new organizational department on-the-spot.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Department Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales, Logistics"
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
