import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Package, Search } from 'lucide-react';

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
    onProductClick: (product: any) => void;
}

export function ProductGrid({ onProductClick }: ProductGridProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await api.get('/inventory/products?limit=100'); // Load top 100 for POS
                const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                setProducts(list);
            } catch (err) {
                console.error("Failed to fetch products for POS:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const categories = ['All', ...Array.from(new Set(products.map(p => p.category || 'Uncategorized')))];

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || (p.category || 'Uncategorized') === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return <div className="flex-1 flex items-center justify-center text-slate-400">Loading catalog...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200 w-full lg:w-[45%] shrink-0">
            <div className="p-4 bg-white border-b border-slate-200 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search product catalog..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredProducts.map(product => (
                        <button
                            key={product.id}
                            onClick={() => onProductClick(product)}
                            className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col group active:scale-95"
                        >
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                                <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="font-bold text-slate-900 text-sm line-clamp-2 leading-tight mb-1">{product.name}</span>
                            <div className="mt-auto flex items-center justify-between w-full">
                                <span className="text-emerald-600 font-black text-sm">₹{parseFloat(product.price as string).toFixed(2)}</span>
                                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">{Number(product.stock)} left</span>
                            </div>
                        </button>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400">
                            No products found matching your search.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
