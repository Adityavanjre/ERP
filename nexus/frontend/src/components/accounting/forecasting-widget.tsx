'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Calendar, AlertCircle, TrendingDown, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';

interface Projection {
    invoiceNumber: string;
    customerName: string;
    amount: number;
    expectedDate: string;
    probability: number;
}

interface ForecastData {
    projections: Projection[];
    totalExpected: number;
}

export function ForecastingWidget() {
    const [data, setData] = useState<ForecastData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchForecast();
    }, []);

    const fetchForecast = async () => {
        try {
            const resp = await api.get('/kernel/health/forecast');
            setData(resp.data);
        } catch (err) {
            console.error('Forecast failed', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-[300px] flex items-center justify-center animate-pulse text-muted-foreground">Analyzing patterns...</div>;
    if (!data) return null;

    return (
        <Card className="border-amber-200/50 bg-amber-50/10 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-black flex items-center gap-2">
                        <TrendingUp className="text-amber-500 w-6 h-6" />
                        Segment Aether: Cashflow Runway
                    </CardTitle>
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 animate-pulse border-amber-200">
                        30-Day Intelligence
                    </Badge>
                </div>
                <CardDescription className="font-medium">
                    Predictive settlement modeling based on historical customer behavior.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white border border-amber-100 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Expected Inflow</span>
                        <div className="text-2xl font-black text-slate-900">₹{data.totalExpected.toLocaleString()}</div>
                        <span className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-1">
                            +12% vs last period <TrendingUp className="w-3 h-3" />
                        </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-amber-100 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Avg. Settlement</span>
                        <div className="text-2xl font-black text-slate-900">18.5 Days</div>
                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-1">
                            Improved by 4.2 days <Clock className="w-3 h-3" />
                        </span>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-500" /> High-Probability Settlements
                    </h4>
                    {data.projections.slice(0, 3).map((proj, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-slate-100"
                        >
                            <div className="flex-1">
                                <div className="text-sm font-bold">{proj.customerName}</div>
                                <div className="text-[10px] text-slate-500">Invoice #{proj.invoiceNumber} • Expected {new Date(proj.expectedDate).toLocaleDateString()}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-black text-slate-900">₹{proj.amount.toLocaleString()}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <Progress value={proj.probability} className="h-1 w-12 bg-slate-100" />
                                    <span className="text-[9px] font-black text-amber-600">{proj.probability}% Confidence</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="pt-2">
                    <div className="bg-amber-900/5 p-3 rounded-xl flex gap-3 border border-amber-900/10">
                        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                        <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
                            <strong>Insight:</strong> 3 invoices from "Aura Financial" are trending 4 days late. Settlement probability adjusted to 65%.
                            Recommend manual follow-up via Klypso Ion.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
