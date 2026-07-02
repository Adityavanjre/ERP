"use client";

import { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Plus, Trash2 } from "lucide-react";

export interface BillingItem {
  id: string;
  description: string;
  hsnSac: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface BillingSection {
  id: string;
  title: string;
  items: BillingItem[];
}

interface DimensionalBillingEditorProps {
  sections: BillingSection[];
  onChange: (sections: BillingSection[]) => void;
}

export function DimensionalBillingEditor({ sections, onChange }: DimensionalBillingEditorProps) {
  const handleAddSection = useCallback(() => {
    onChange([...sections, { id: Date.now().toString(), title: "", items: [] }]);
  }, [sections, onChange]);

  const handleAddItem = useCallback((sectionId: string) => {
    onChange(sections.map((s) =>
      s.id === sectionId
        ? { ...s, items: [...s.items, { id: Date.now().toString(), description: "", hsnSac: "", qty: 1, rate: 0, amount: 0 }] }
        : s
    ));
  }, [sections, onChange]);

  const handleRemoveItem = useCallback((sectionId: string, itemId: string) => {
    onChange(sections.map((s) =>
      s.id === sectionId
        ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
        : s
    ));
  }, [sections, onChange]);

  const handleSectionTitleChange = useCallback((sectionId: string, title: string) => {
    onChange(sections.map((s) =>
      s.id === sectionId ? { ...s, title } : s
    ));
  }, [sections, onChange]);

  const handleItemChange = useCallback((sectionId: string, itemId: string, field: keyof BillingItem, value: string | number) => {
    onChange(sections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            items: s.items.map((i) => {
              if (i.id !== itemId) return i;
              const updated = { ...i, [field]: field === "qty" || field === "rate" ? Number(value) : value };
              if (field === "qty" || field === "rate") {
                updated.amount = Number(updated.qty) * Number(updated.rate);
              }
              return updated;
            }),
          }
        : s
    ));
  }, [sections, onChange]);

  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <div key={section.id} className="border border-slate-200 rounded-lg p-3">
          <div className="space-y-2 mb-3">
            <Label>Section Title</Label>
            <Input
              className="bg-slate-50 border-slate-200 text-slate-900"
              value={section.title}
              onChange={(e) => handleSectionTitleChange(section.id, e.target.value)}
              placeholder="e.g. Materials, Labor, Transport"
            />
          </div>
          <div className="space-y-2">
            {section.items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <Label>Description</Label>
                  <Input
                    className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8"
                    value={item.description}
                    onChange={(e) => handleItemChange(section.id, item.id, "description", e.target.value)}
                    placeholder="Item description"
                  />
                </div>
                <div className="col-span-2">
                  <Label>HSN/SAC</Label>
                  <Input
                    className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8"
                    value={item.hsnSac}
                    onChange={(e) => handleItemChange(section.id, item.id, "hsnSac", e.target.value)}
                    placeholder="998311"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8"
                    value={item.qty}
                    onChange={(e) => handleItemChange(section.id, item.id, "qty", e.target.value)}
                    min="0"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Rate</Label>
                  <Input
                    type="number"
                    className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8"
                    value={item.rate}
                    onChange={(e) => handleItemChange(section.id, item.id, "rate", e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-span-1">
                  <Label>Amount</Label>
                  <div className="text-xs h-8 flex items-center text-slate-600 font-mono">
                    ₹{item.amount.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="col-span-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-rose-500"
                    onClick={() => handleRemoveItem(section.id, item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleAddItem(section.id)}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Item
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={handleAddSection}>
        <Plus className="h-4 w-4 mr-2" /> Add Section
      </Button>
    </div>
  );
}