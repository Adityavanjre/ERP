"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be >= 0"),
  costPrice: z.coerce.number().min(0, "Cost Price must be >= 0"),
  baseUnit: z.string().min(1, "Base Unit is required"),
  pricingMode: z.string().optional(),
  width: z.coerce.number().min(0).optional(),
  length: z.coerce.number().min(0).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number;
  baseUnit: string;
  stock: number;
  pricingMode?: string | null;
  width?: number | null;
  length?: number | null;
}

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  product: Product | null;
}

export function EditProductDialog({
  open,
  onOpenChange,
  onSuccess,
  product,
}: EditProductDialogProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema as any),
    defaultValues: {
      name: "",
      sku: "",
      category: "",
      price: 0,
      costPrice: 0,
      baseUnit: "pcs",
      pricingMode: "piece",
      width: 0,
      length: 0,
    },
  });

  const pricingMode = watch("pricingMode");

  useEffect(() => {
    if (product) {
      reset({
        name: product.name || "",
        sku: product.sku || "",
        category: product.category || "",
        price: Number(product.price) || 0,
        costPrice: Number(product.costPrice) || 0,
        baseUnit: product.baseUnit || "pcs",
        pricingMode: product.pricingMode || "piece",
        width: Number(product.width) || 0,
        length: Number(product.length) || 0,
      });
    }
  }, [product, reset]);

  const onSubmit = useCallback(
    async (data: ProductFormValues) => {
      if (!product) return;
      setLoading(true);
      try {
        const { price, baseUnit, ...rest } = data;
        const payload = {
          ...rest,
          basePrice: price,
          uom: baseUnit,
          category: data.category || "",
          pricingMode: data.pricingMode || "piece",
          width: data.pricingMode === "area" ? data.width : null,
          length: data.pricingMode === "area" ? data.length : null,
        };
        await api.patch(`inventory/products/${product.id}`, payload);
        toast.success("Product updated successfully");
        onOpenChange(false);
        onSuccess?.();
        reset();
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || "Failed to update product");
      } finally {
        setLoading(false);
      }
    },
    [product, onOpenChange, onSuccess, reset],
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-[500px] rounded-[32px] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
            Edit Product
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Modify the product catalog details. Note: Stock levels cannot be edited here.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2">
              <Label
                htmlFor="name"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
              >
                Product Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="name"
                {...register("name")}
                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
              />
              {errors.name && (
                <p className="text-xs text-rose-500 font-semibold ml-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="sku"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
              >
                SKU <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="sku"
                {...register("sku")}
                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold uppercase"
              />
              {errors.sku && (
                <p className="text-xs text-rose-500 font-semibold ml-1">
                  {errors.sku.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2">
              <Label
                htmlFor="category"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
              >
                Category
              </Label>
              <Input
                id="category"
                {...register("category")}
                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="baseUnit"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
              >
                Base Unit
              </Label>
              <Input
                id="baseUnit"
                {...register("baseUnit")}
                placeholder="pcs, kg, etc."
                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
              />
              {errors.baseUnit && (
                <p className="text-xs text-rose-500 font-semibold ml-1">
                  {errors.baseUnit.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2">
              <Label
                htmlFor="price"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
              >
                Selling Price
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register("price")}
                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
              />
              {errors.price && (
                <p className="text-xs text-rose-500 font-semibold ml-1">
                  {errors.price.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="costPrice"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
              >
                Cost Price
              </Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                {...register("costPrice")}
                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
              />
              {errors.costPrice && (
                <p className="text-xs text-rose-500 font-semibold ml-1">
                  {errors.costPrice.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2">
              <Label
                htmlFor="pricingMode"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
              >
                Pricing Mode
              </Label>
              <select
                id="pricingMode"
                {...register("pricingMode")}
                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold px-3"
              >
                <option value="piece">Piece-Based</option>
                <option value="area">Area-Based (Dimensional)</option>
              </select>
            </div>
            <div className="grid gap-2" />
          </div>
          {pricingMode === "area" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label
                  htmlFor="width"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
                >
                  Width (m)
                </Label>
                <Input
                  id="width"
                  type="number"
                  step="0.001"
                  {...register("width")}
                  className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                />
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="length"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
                >
                  Length (m)
                </Label>
                <Input
                  id="length"
                  type="number"
                  step="0.001"
                  {...register("length")}
                  className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                />
              </div>
            </div>
          )}
          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              className="rounded-xl font-bold h-11 px-3"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-11 px-3 font-black uppercase tracking-widest shadow-lg shadow-amber-500/20"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
