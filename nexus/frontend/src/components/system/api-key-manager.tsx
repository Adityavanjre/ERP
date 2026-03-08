'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Key, Plus, Trash2, Copy, Check, ShieldCheck, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    lastUsedAt: string | null;
    createdAt: string;
}

export function ApiKeyManager() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [newName, setNewName] = useState('');
    const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            const resp = await api.get('system/api/keys');
            setKeys(resp.data);
        } catch {
            toast.error('Failed to load API keys');
        } finally {
            setLoading(false);
        }
    };

    const generateKey = async () => {
        if (!newName.trim()) return toast.error('Key name is required');
        try {
            const resp = await api.post('system/api/keys', {
                name: newName,
                scopes: ['read:all', 'write:all'], // Default for now
            });
            setNewKeySecret(resp.data.key);
            setNewName('');
            fetchKeys();
            toast.success('API Key generated successfully');
        } catch {
            toast.error('Failed to generate key');
        }
    };

    const revokeKey = async (id: string) => {
        if (!confirm('Are you sure? This will immediately break any external integrations using this key.')) return;
        try {
            await api.delete(`/system/api/keys/${id}`);
            fetchKeys();
            toast.success('Key revoked');
        } catch {
            toast.error('Failed to revoke key');
        }
    };

    const copyToClipboard = () => {
        if (!newKeySecret) return;
        navigator.clipboard.writeText(newKeySecret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <Card className="border-blue-200/50 bg-blue-50/5 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <Key className="text-blue-500 w-6 h-6" />
                                Klypso: API Access
                            </CardTitle>
                            <CardDescription className="font-medium">
                                Generate secure credentials for external integrations and automations.
                            </CardDescription>
                        </div>
                        <ShieldCheck className="w-10 h-10 text-blue-500/20" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-end bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-black uppercase text-slate-500 tracking-widest pl-1">Key Description</label>
                            <Input
                                placeholder="e.g. WhatsApp Bot, Zapier Integration"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="border-none bg-slate-50 h-11 focus-visible:ring-blue-500/20 font-bold"
                            />
                        </div>
                        <Button onClick={generateKey} className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                            <Plus className="w-4 h-4 mr-2" /> Create Secret
                        </Button>
                    </div>

                    <AnimatePresence>
                        {newKeySecret && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-6 p-6 rounded-2xl bg-slate-900 text-white border-2 border-blue-500/50 shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-2">
                                    <Badge className="bg-blue-500 text-white font-black border-none px-3 py-1 animate-pulse">SECRET GENERATED</Badge>
                                </div>
                                <div className="flex items-center gap-3 mb-2 text-blue-400">
                                    <ShieldAlert className="w-5 h-5" />
                                    <span className="text-xs font-black uppercase tracking-widest">Copy this key now. It will never be shown again.</span>
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <div className="flex-1 bg-white/10 p-4 rounded-xl font-mono text-lg break-all border border-white/5 select-all">
                                        {newKeySecret}
                                    </div>
                                    <Button onClick={copyToClipboard} size="icon" className="h-16 w-16 rounded-xl bg-white/20 hover:bg-white/30 text-white">
                                        {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                                    </Button>
                                </div>
                                <Button variant="ghost" className="mt-4 text-white/50 hover:text-white text-xs" onClick={() => setNewKeySecret(null)}>
                                    I have saved this key safely
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>

            <Card className="rounded-[32px] overflow-hidden border-none shadow-xl shadow-slate-200/40">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
                    <CardTitle className="text-lg font-black tracking-tight">Active Credentials</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-50">
                        {loading ? (
                            <div className="p-12 text-center animate-pulse text-slate-400 font-bold tracking-widest uppercase text-xs">Synchronizing Vault...</div>
                        ) : keys.length === 0 ? (
                            <div className="p-16 text-center text-slate-400 font-medium italic">No API keys active. Connectivity is offline.</div>
                        ) : (
                            keys.map((key) => (
                                <div key={key.id} className="p-6 px-8 flex items-center justify-between hover:bg-slate-50 transition-all group">
                                    <div className="flex items-center gap-6">
                                        <div className="p-3.5 bg-slate-900 rounded-2xl shadow-lg shadow-slate-900/10 group-hover:scale-110 transition-transform">
                                            <Key className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-lg leading-tight">{key.name}</h4>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <code className="text-[10px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase tracking-widest">{key.prefix}.****</code>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                    {key.lastUsedAt ? `Last Used: ${new Date(key.lastUsedAt).toLocaleDateString()}` : 'Never Used'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex gap-2">
                                            {key.scopes.map(s => (
                                                <Badge key={s} variant="secondary" className="bg-blue-50 text-blue-600 border-none font-bold text-[9px] uppercase tracking-widest">{s}</Badge>
                                            ))}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => revokeKey(key.id)}
                                            className="h-11 w-11 rounded-xl text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
