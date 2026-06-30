import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api";
import { Package, Search } from "lucide-react";
import { InlineCreateProductDialog } from "../../shared/inline-create-product-dialog";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: string | number;
  stock: string | number;
  category?: string;
  gstRate?: number;
}

interface ProductGridProps {
  onProductClick: (product: Product) => void;
}

export function ProductGrid({ onProductClick }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get("inventory/products?limit=100"); // No leading slash - api baseURL already has /v1
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setProducts(list);
    } catch (err) {
      console.error("Failed to fetch products for POS:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const hasLoadedRef = React.useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    fetchProducts();
  }, [fetchProducts]);

  const categories = [
    "All",
    ...Array.from(new Set(products.map((p) => p.category || "Uncategorized"))),
  ];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      (p.category || "Uncategorized") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Loading catalog...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-50">
      <div className="p-3 bg-white border-b border-slate-200 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search product catalog..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm shadow-blue-500/10 flex items-center gap-1"
          >
            + Product
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => onProductClick(product)}
              className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col group active:scale-95"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                <Package className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <span className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight mb-1">
                {product.name}
              </span>
              <div className="mt-auto flex items-center justify-between w-full">
                <span className="text-emerald-600 font-black text-xs">
                  ₹{parseFloat(product.price as string).toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-1 py-0.5 rounded">
                  {Number(product.stock)}
                </span>
              </div>
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-4 text-center text-slate-400">
              No products found matching your search.
            </div>
          )}
        </div>
      </div>
      <InlineCreateProductDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={(newProduct) => {
          fetchProducts();
          onProductClick(newProduct);
        }}
      />
    </div>
  );
}
