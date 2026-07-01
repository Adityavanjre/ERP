import React, { useState, useEffect } from "react";
import { Barcode, Loader2, Search } from "lucide-react";
import { api } from "../../../lib/api";
import { fuzzySearch, deduplicateResults } from "../../../lib/fuzzy-search";

interface BarcodeSearchProps {
  search: string;
  setSearch: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSearching: boolean;
  lastScanFailed: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onAddProduct?: () => void;
  onProductSelect?: (product: any) => void;
}

interface SearchProduct {
  id: string;
  name: string;
  sku: string;
  price: string | number;
  gstRate: number;
}

export const BarcodeSearch: React.FC<BarcodeSearchProps> = ({
  search,
  setSearch,
  onSubmit,
  isSearching,
  lastScanFailed,
  inputRef,
  onAddProduct,
  onProductSelect,
}) => {
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchResults, setProductSearchResults] = useState<SearchProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [allProducts, setAllProducts] = useState<SearchProduct[]>([]);

  // Load all products on mount (for fuzzy search)
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await api.get("inventory/products?limit=500");
        const products = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.data || [];
        setAllProducts(products);
      } catch (error) {
        console.error("Failed to load products:", error);
      }
    };
    loadProducts();
  }, []);

  // Debounced product search with fuzzy matching
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.length > 2 && !search.includes("*")) {
        setIsLoadingProducts(true);
        try {
          // First try API search for exact matches
          const apiRes = await api.get(`inventory/products?search=${search}`);
          const apiProducts = Array.isArray(apiRes.data) ? apiRes.data : apiRes.data?.items || apiRes.data?.data || [];
          
          // Apply fuzzy search for better matching
          const fuzzyMatches = fuzzySearch(
            allProducts.length > 0 ? allProducts : apiProducts,
            search,
            ["name" as keyof SearchProduct, "sku" as keyof SearchProduct],
            0.25 // Lower threshold for better matches with typos
          );
          
          // Deduplicate and get top 5 results
          const deduplicated = deduplicateResults(fuzzyMatches, (item) => item.id);
          const results = deduplicated.slice(0, 5).map((match) => match.item);
          
          setProductSearchResults(results);
          setShowProductSearch(true);
        } catch (error) {
          console.error("Search error:", error);
          setProductSearchResults([]);
        } finally {
          setIsLoadingProducts(false);
        }
      } else {
        setShowProductSearch(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, allProducts]);

  const handleProductSelect = (product: SearchProduct) => {
    if (onProductSelect) {
      onProductSelect({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: typeof product.price === "string" ? parseFloat(product.price) : product.price,
        gstRate: product.gstRate || 0,
      });
    }
    setSearch("");
    setShowProductSearch(false);
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={onSubmit}
      className={`flex items-center gap-3 px-4 py-2 transition-colors relative ${
        lastScanFailed ? "bg-rose-50" : "bg-slate-50"
      }`}
    >
      {/* Icon */}
      <div className={`shrink-0 ${lastScanFailed ? "text-rose-500" : "text-slate-400"}`}>
        {isSearching ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        ) : (
          <Barcode className="w-4 h-4" />
        )}
      </div>

      {/* Input Container (with dropdown support) */}
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => search.length > 2 && setShowProductSearch(true)}
          placeholder="Scan barcode or type product name… (e.g. 2*SKU-01 for qty)"
          className={`w-full h-9 bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-300 outline-none border-none focus:ring-0 ${
            lastScanFailed ? "placeholder:text-rose-300" : ""
          }`}
        />

        {/* Product Search Dropdown */}
        {showProductSearch && search.length > 2 && productSearchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <Search className="w-3 h-3 inline mr-1" />
              Product Search Results
            </div>
            {productSearchResults.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleProductSelect(product)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-50 last:border-b-0 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 truncate">{product.name}</div>
                    <div className="text-[10px] text-slate-500">SKU: {product.sku}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-blue-600">₹{Number(product.price).toLocaleString("en-IN")}</div>
                    <div className="text-[10px] text-slate-400">{product.gstRate}% GST</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {showProductSearch && isLoadingProducts && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 px-3 py-2 text-center">
            <Loader2 className="w-3 h-3 inline animate-spin text-blue-600" />
            <span className="text-xs text-slate-500 ml-2">Searching products...</span>
          </div>
        )}

        {showProductSearch && search.length > 2 && productSearchResults.length === 0 && !isLoadingProducts && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 px-3 py-2 text-center">
            <span className="text-xs text-slate-400">No products found</span>
          </div>
        )}
      </div>

      {/* Inline Create Product Button */}
      {onAddProduct && (
        <button
          type="button"
          onClick={onAddProduct}
          className="shrink-0 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 transition-colors shadow-sm"
        >
          + Product
        </button>
      )}

      {/* Status badge */}
      <span
        className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
          lastScanFailed
            ? "bg-rose-100 text-rose-600"
            : isSearching
            ? "bg-blue-50 text-blue-600"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {lastScanFailed ? "Not Found" : isSearching ? "Searching..." : "Ready"}
      </span>
    </form>
  );
};
