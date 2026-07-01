"use client";

import { useState, useEffect } from "react";
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

interface InlineCreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newProduct: Record<string, unknown>) => void;
}

export function InlineCreateProductDialog({
  open,
  onOpenChange,
  onSuccess,
}: InlineCreateProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Record<string, unknown>[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: "",
    costPrice: "",
    baseUnit: "Kgs",
    gstRate: "18",
    hsnCode: "",
    stock: "0",
    warehouseId: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      api.get("inventory/warehouses")
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
          setWarehouses(list);
          if (list.length > 0) {
            setFormData((prev) => ({ ...prev, warehouseId: list[0].id }));
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) {
      errs.name = "Product name is required";
    }
    if (!formData.price.trim() || Number(formData.price) < 0) {
      errs.price = "Valid price is required";
    }
    if (Number(formData.stock) > 0 && !formData.warehouseId) {
      errs.warehouseId = "Warehouse is required when initial stock is positive";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const generatedSku = formData.sku.trim() || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const payload = {
        name: formData.name.trim(),
        sku: generatedSku,
        price: Number(formData.price),
        costPrice: formData.costPrice ? Number(formData.costPrice) : 0,
        baseUnit: formData.baseUnit,
        gstRate: Number(formData.gstRate),
        hsnCode: formData.hsnCode.trim() || undefined,
        stock: Number(formData.stock),
        warehouseId: Number(formData.stock) > 0 ? formData.warehouseId : undefined,
      };

      const res = await api.post("inventory/products", payload);
      toast.success("Product created successfully");
      setFormData({
        name: "",
        sku: "",
        price: "",
        costPrice: "",
        baseUnit: "Kgs",
        gstRate: "18",
        hsnCode: "",
        stock: "0",
        warehouseId: warehouses.length > 0 ? warehouses[0].id : "",
      });
      onOpenChange(false);
      onSuccess?.(res.data?.data || res.data);
    } catch (error: Record<string, unknown>) {
      toast.error(error.response?.data?.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-11/12 sm:max-w-[480px] rounded-[32px] border-none shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
            Create Product Inline
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Register a new product on-the-spot. Optional fields can be left blank.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Product Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Premium White Marble"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-[10px] text-red-500 font-bold">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">SKU (Auto-gen if empty)</Label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g. WM-01"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">UoM (Unit)</Label>
              <select
                value={formData.baseUnit}
                onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Kgs">Kgs</option>
                <option value="Tons">Tons</option>
                <option value="Bags">Bags</option>
                <option value="Pieces">Pieces</option>
                <option value="Sq Meter">Sq Meter</option>
                <option value="Litres">Litres</option>
                <option value="Metres">Metres</option>
                <option value="Boxes">Boxes</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Selling Price *</Label>
              <Input
                type="number"
                step="any"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className={errors.price ? "border-red-500" : ""}
              />
              {errors.price && <p className="text-[10px] text-red-500 font-bold">{errors.price}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Cost Price</Label>
              <Input
                type="number"
                step="any"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">GST Rate (%)</Label>
              <select
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">HSN Code</Label>
              <Input
                value={formData.hsnCode}
                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                placeholder="e.g. 6802"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Initial Stock</Label>
              <Input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
              />
            </div>
            {Number(formData.stock) > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Warehouse *</Label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select warehouse...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                {errors.warehouseId && <p className="text-[10px] text-red-500 font-bold">{errors.warehouseId}</p>}
              </div>
            )}
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
