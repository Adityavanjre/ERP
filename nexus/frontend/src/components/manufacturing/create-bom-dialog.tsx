'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Product {
    id: string;
    name: string;
    sku: string;
    unit: string;
    category?: string;
    costPrice?: number;
    stock?: number;
}

interface BOMItem {
    productId: string;
    quantity: number;
    unit: string;
}

interface CreateBOMDialogProps {
    refreshData: () => void;
    children: React.ReactNode;
}

export function CreateBOMDialog({ refreshData, children }: CreateBOMDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);

    // Form State
    const [name, setName] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [overheadRate, setOverheadRate] = useState(0);
    const [isOverheadFixed, setIsOverheadFixed] = useState(false);
    const [items, setItems] = useState<BOMItem[]>([]);

    useEffect(() => {
        if (open) {
            fetchProducts();
        }
    }, [open]);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/inventory/products');
            // Handle both paginated ({ data: [...] }) and flat ([...]) responses
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setProducts(list);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load products. Check console.");
        }
    };

    const addItem = () => {
        setItems([...items, { productId: '', quantity: 1, unit: 'pcs' }]);
    };

    const updateItem = (index: number, field: keyof BOMItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Auto-set unit if product changes
        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            if (product) {
                newItems[index].unit = product.unit || 'pcs';
            }
        }
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!name || !selectedProduct) {
            toast.error("Name and Finished Good are required");
            return;
        }
        if (items.length === 0) {
            toast.error("Add at least one raw material");
            return;
        }

        try {
            setLoading(true);
            await api.post('/manufacturing/boms', {
                name,
                productId: selectedProduct,
                quantity,
                overheadRate,
                isOverheadFixed,
                items
            });
            toast.success("BOM Created Successfully");
            setOpen(false);
            refreshData();
            // Reset form
            setName('');
            setSelectedProduct('');
            setItems([]);
        } catch (err) {
            console.error(err);
            toast.error("Failed to create BOM");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Bill of Materials</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>BOM Name</Label>
                            <Input placeholder="e.g. Standard Production" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Finished Good (Output)</Label>
                            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Product to Manufacture" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from(new Set(products.map(p => p.category || 'Uncategorized'))).map(category => (
                                        <SelectGroup key={category}>
                                            <SelectLabel>{category}</SelectLabel>
                                            {products.filter(p => (p.category || 'Uncategorized') === category).map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground">
                                Product must exist in Inventory first.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Output Quantity</Label>
                            <Input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Extra Cost % (Overhead)</Label>
                            <div className="flex gap-2">
                                <Input type="number" min="0" value={overheadRate} onChange={e => setOverheadRate(Number(e.target.value))} />
                                <Button
                                    variant="outline"
                                    className={`w-12 ${isOverheadFixed ? 'bg-primary text-primary-foreground' : ''}`}
                                    onClick={() => setIsOverheadFixed(!isOverheadFixed)}
                                >
                                    {isOverheadFixed ? '$' : '%'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <Label>Raw Materials / Components</Label>
                                <p className="text-[10px] text-muted-foreground">Add the items required to build 1 unit of the finished good.</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={addItem}>
                                <Plus className="w-4 h-4 mr-1" /> Add Component
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-3 items-end">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-xs text-muted-foreground">Component</Label>
                                        <Select value={item.productId} onValueChange={v => updateItem(index, 'productId', v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Material" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.from(new Set(products.map(p => p.category || 'Uncategorized'))).map(category => (
                                                    <SelectGroup key={category}>
                                                        <SelectLabel>{category}</SelectLabel>
                                                        {products.filter(p => (p.category || 'Uncategorized') === category).map(p => (
                                                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock} avail)</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <Label className="text-xs text-muted-foreground">Qty</Label>
                                        <Input type="number" min="0" step="0.1" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} />
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <Label className="text-xs text-muted-foreground">Unit</Label>
                                        <Input value={item.unit} readOnly className="bg-muted" />
                                    </div>
                                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeItem(index)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {items.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                                    No items added. Click "Add Item" to start.
                                </div>
                            )}
                        </div>
                    </div>

                    <Button onClick={handleSubmit} disabled={loading} className="w-full mt-2">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Create BOM
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
