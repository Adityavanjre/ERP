import React from "react";
import { Search, Trash2, Plus, Minus } from "lucide-react";

interface Item {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  gstRate: number;
  pricingMode?: string;
  width?: number | null;
  length?: number | null;
  sheets?: number;
  ratePerSqm?: number;
}

interface CartTableProps {
  items: Item[];
  updateQty: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  updateAreaField?: (id: string, field: "sheets" | "ratePerSqm", value: number) => void;
  currencySymbol?: string;
  getItemAmount?: (item: Item) => number;
}

export const CartTable: React.FC<CartTableProps> = ({
  items,
  updateQty,
  removeItem,
  setItems,
  updateAreaField,
  currencySymbol = "₹",
  getItemAmount,
}) => {
  const calcAmount = getItemAmount || ((item: Item) => item.price * item.quantity);

  return (
    <div className="flex-1 px-4 pb-4 pt-2">
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider w-10">#</th>
              <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">Item</th>
              <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center w-32">
                {items.some((i) => i.pricingMode === "area") ? "Details" : "Qty"}
              </th>
              <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right w-24">Rate</th>
              <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right w-28">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-slate-300">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-6 h-6 opacity-20 text-slate-400" />
                    <p className="text-sm font-bold text-slate-400">Scan items to begin</p>
                  </div>
                </td>
              </tr>
            )}
            {items.map((item, idx) => {
              const isArea = item.pricingMode === "area";
              const amount = calcAmount(item);
              return (
                <tr
                  key={item.productId}
                  className="hover:bg-blue-50/50 transition-colors group"
                >
                  <td className="px-3 py-2">
                    <span className="text-sm font-bold text-slate-300 group-hover:text-blue-300 tabular-nums">
                      {(idx + 1).toString().padStart(2, "0")}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <p className="text-sm font-black text-slate-900 leading-tight">{item.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tight">{item.sku}</p>
                    {isArea && item.width && item.length && (
                      <p className="text-[10px] font-bold text-blue-500 mt-0.5">
                        {item.width}m × {item.length}m = {(item.width * item.length).toFixed(2)} SQM/sheet
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isArea ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-[9px] font-bold text-slate-400 w-12 text-right">Sheets</span>
                          <button
                            onClick={() => updateAreaField?.(item.productId, "sheets", Math.max(0, (item.sheets || 1) - 1))}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-600 flex items-center justify-center transition-all active:scale-90"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={item.sheets || 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 0) updateAreaField?.(item.productId, "sheets", val);
                            }}
                            className="w-10 text-center text-sm font-black tabular-nums text-slate-900 bg-transparent outline-none border-b-2 border-transparent focus:border-blue-500 transition-colors"
                          />
                          <button
                            onClick={() => updateAreaField?.(item.productId, "sheets", (item.sheets || 0) + 1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-600 text-slate-600 flex items-center justify-center transition-all active:scale-90"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-[9px] font-bold text-slate-400 w-12 text-right">Rate/m²</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.ratePerSqm || 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0) updateAreaField?.(item.productId, "ratePerSqm", val);
                            }}
                            className="w-20 text-center text-xs font-bold tabular-nums text-slate-900 bg-slate-50 rounded-lg px-1 py-0.5 outline-none border border-slate-200 focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => updateQty(item.productId, -1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-600 flex items-center justify-center transition-all active:scale-90"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0) {
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.productId === item.productId ? { ...i, quantity: val } : i,
                                ),
                              );
                            }
                          }}
                          className="w-12 text-center text-base font-black tabular-nums text-slate-900 bg-transparent outline-none border-b-2 border-transparent focus:border-blue-500 transition-colors"
                        />
                        <button
                          onClick={() => updateQty(item.productId, 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-600 text-slate-600 flex items-center justify-center transition-all active:scale-90"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isArea ? (
                      <p className="text-xs font-bold text-slate-500 tabular-nums">{currencySymbol}{(item.ratePerSqm || 0).toFixed(2)}/m²</p>
                    ) : (
                      <p className="text-sm font-bold text-slate-600 tabular-nums">{currencySymbol}{item.price.toFixed(2)}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right relative">
                    <p className="text-base font-black text-slate-900 tabular-nums">{currencySymbol}{amount.toFixed(2)}</p>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 mr-1 p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
