import React from 'react';
import { Search, Trash2, Plus, Minus } from 'lucide-react';

interface Item {
    productId: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    gstRate: number;
}

interface CartTableProps {
    items: Item[];
    updateQty: (id: string, delta: number) => void;
    removeItem: (id: string) => void;
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}

export const CartTable: React.FC<CartTableProps> = ({
    items,
    updateQty,
    removeItem,
    setItems
}) => {
    return (
        <div className="flex-1 overflow-auto px-6 pb-6 mt-0">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider pl-8 w-20">#</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Item Details</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center w-48">Quantity</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right w-32">Rate</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right pr-8 w-40">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-8 py-24 text-center text-slate-300 italic">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200">
                                            <Search className="w-8 h-8 opacity-20 text-slate-400" />
                                        </div>
                                        <p className="text-xl font-bold text-slate-400">Scan items to begin</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {items.map((item, idx) => (
                            <tr key={item.productId} className="hover:bg-blue-50/50 transition-colors group">
                                <td className="px-6 py-4 pl-8">
                                    <span className="text-lg font-bold text-slate-300 group-hover:text-blue-300 tabular-nums">{(idx + 1).toString().padStart(2, '0')}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-xl font-black text-slate-900 leading-tight">{item.name}</p>
                                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">{item.sku}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => updateQty(item.productId, -1)}
                                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-600 flex items-center justify-center transition-all active:scale-90"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <input
                                            type="number"
                                            step="any"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                if (!isNaN(val) && val >= 0) {
                                                    setItems(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: val } : i));
                                                }
                                            }}
                                            className="w-20 text-center text-2xl font-black tabular-nums text-slate-900 bg-transparent outline-none border-b-2 border-transparent focus:border-blue-500 transition-colors"
                                        />
                                        <button
                                            onClick={() => updateQty(item.productId, 1)}
                                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-600 text-slate-600 flex items-center justify-center transition-all active:scale-90"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="text-lg font-bold text-slate-600 tabular-nums">₹{item.price.toFixed(2)}</p>
                                </td>
                                <td className="px-6 py-4 text-right pr-8 relative">
                                    <p className="text-2xl font-black text-slate-900 tabular-nums">₹{(item.price * item.quantity).toFixed(2)}</p>
                                    <button
                                        onClick={() => removeItem(item.productId)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 mr-2 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
