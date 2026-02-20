import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../api/config';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Mail, Calendar, Search, Users, ShieldCheck, User, ChevronRight, Lock, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SystemUser {
    _id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    createdAt: string;
}

const ManageUsers = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const selectedUser = users.find(u => u._id === selectedId);

    useEffect(() => {
        if (user) fetchUsers();
    }, [user]);

    const fetchUsers = async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user?.token}` },
            };
            const { data } = await axios.get(`${API_URL}/api/users`, config);
            setUsers(data);
            if (data.length > 0) setSelectedId(data[0]._id);
        } catch (error) {
            console.error('Error fetching users', error);
        } finally {
            setLoading(false);
            setNewPassword('');
            setIsResetting(false);
        }
    };

    const handleToggleRole = async (id: string, currentIsAdmin: boolean) => {
        if (!window.confirm(`Are you sure you want to ${currentIsAdmin ? 'demote' : 'promote'} this user?`)) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user?.token}` } };
            await axios.put(`${API_URL}/api/users/${id}/role`, { isAdmin: !currentIsAdmin }, config);
            setUsers(prev => prev.map(u => u._id === id ? { ...u, isAdmin: !currentIsAdmin } : u));
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error updating user role');
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm('Erase this user from the system? This action cannot be undone.')) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user?.token}` } };
            await axios.delete(`${API_URL}/api/users/${id}`, config);
            setUsers(prev => prev.filter(u => u._id !== id));
            if (selectedId === id) {
                setSelectedId(null);
                setNewPassword('');
                setIsResetting(false);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error deleting user');
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        try {
            setIsResetting(true);
            const config = { headers: { Authorization: `Bearer ${user?.token}` } };
            await axios.put(`${API_URL}/api/users/${selectedUser._id}/password`, { password: newPassword }, config);
            alert('Password successfully updated.');
            setNewPassword('');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error resetting password');
        } finally {
            setIsResetting(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 gap-4">
            <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold uppercase tracking-widest">Scanning Identities...</p>
        </div>
    );

    return (
        <div className="h-[calc(100vh-180px)] flex flex-col">
            {/* Split View Container */}
            <div className="flex-1 flex gap-8 overflow-hidden">

                {/* Scrollable List Column */}
                <div className="w-1/3 min-w-[320px] flex flex-col bg-[#141417] border border-white/5 rounded-2xl overflow-hidden shadow-sm">
                    {/* List Header */}
                    <div className="p-5 border-b border-white/5 space-y-4 bg-black/20">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold flex items-center gap-2 font-heading text-lg tracking-tight">
                                <Users size={18} className="text-[#C5A059]" /> Identity Ledger
                            </h2>
                            <span className="bg-white/5 px-2 py-0.5 rounded-md text-[10px] font-bold text-zinc-400 font-mono">{filteredUsers.length} Nodes</span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059]/50 transition-all font-medium"
                            />
                        </div>
                    </div>

                    {/* The List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {filteredUsers.length === 0 ? (
                            <div className="text-center py-20 text-zinc-600 font-medium text-xs">No records matching query</div>
                        ) : (
                            filteredUsers.map((u) => (
                                <button
                                    key={u._id}
                                    onClick={() => {
                                        setSelectedId(u._id);
                                        setNewPassword('');
                                    }}
                                    className={`w-full text-left p-4 rounded-xl transition-all border group relative ${selectedId === u._id ? 'bg-[#C5A059]/10 border-[#C5A059]/20 shadow-lg shadow-[#C5A059]/5' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`font-bold text-sm tracking-tight ${selectedId === u._id ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>{u.name}</h3>
                                        <div className="flex items-center gap-1">
                                            {u.isAdmin && <ShieldCheck size={12} className="text-[#C5A059]" />}
                                            <span className={`text-[9px] font-bold uppercase tracking-widest ${selectedId === u._id ? 'text-[#C5A059]/60' : 'text-zinc-600'}`}>
                                                {u.isAdmin ? 'Admin' : 'User'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-[10px] font-bold tracking-tight opacity-60 italic ${selectedId === u._id ? 'text-[#C5A059]/80' : 'text-zinc-500'}`}>{u.email}</p>
                                        <div className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={14} /></div>
                                    </div>
                                    {selectedId === u._id && (
                                        <motion.div layoutId="selected-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#C5A059] rounded-r-full" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Details Column */}
                <div className="flex-1 flex flex-col bg-[#141417] border border-white/5 rounded-2xl overflow-hidden shadow-sm relative">
                    <AnimatePresence mode="wait">
                        {selectedUser ? (
                            <motion.div
                                key={selectedUser._id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex-1 flex flex-col overflow-hidden"
                            >
                                {/* Detail Header */}
                                <div className="p-8 border-b border-white/5 bg-black/10 flex justify-between items-start">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C5A059] px-3 py-1 bg-[#C5A059]/10 rounded-full border border-[#C5A059]/10">System Identity</span>
                                            <span className="text-zinc-700 text-xs">/</span>
                                            <span className="text-zinc-500 text-[10px] font-mono font-bold uppercase tracking-widest">{selectedUser._id}</span>
                                        </div>
                                        <h2 className="text-4xl font-bold text-white tracking-tight font-heading">{selectedUser.name}</h2>
                                        <p className="text-zinc-500 text-xs font-medium flex items-center gap-2 italic">
                                            Account created on {new Date(selectedUser.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className={`p-4 rounded-2xl border ${selectedUser.isAdmin ? 'bg-[#C5A059]/10 border-[#C5A059]/20 text-[#C5A059]' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>
                                        {selectedUser.isAdmin ? <ShieldCheck size={24} /> : <User size={24} />}
                                    </div>
                                </div>

                                {/* Detail Content */}
                                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                                    {/* Primary Info Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <InfoBlock icon={<User size={16} />} label="Display Name" value={selectedUser.name} />
                                        <InfoBlock icon={<Mail size={16} />} label="Email Address" value={selectedUser.email} isLink link={`mailto:${selectedUser.email}`} />
                                    </div>

                                    {/* Security Section */}
                                    <div className="space-y-6">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 flex items-center gap-3">
                                            <Lock size={14} className="text-[#C5A059]" /> Access Configuration
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <button
                                                onClick={() => handleToggleRole(selectedUser._id, selectedUser.isAdmin)}
                                                className="bg-black/40 border border-white/5 rounded-3xl p-8 flex items-center justify-between group hover:border-white/20 transition-all text-left"
                                            >
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-white">Administrator Access</p>
                                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Click to toggle privilege</p>
                                                </div>
                                                <div className={`w-12 h-6 rounded-full relative transition-colors ${selectedUser.isAdmin ? 'bg-[#C5A059]' : 'bg-zinc-800'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${selectedUser.isAdmin ? 'left-7' : 'left-1'}`} />
                                                </div>
                                            </button>
                                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 space-y-3">
                                                <div className="flex items-center gap-3 text-[#C5A059]">
                                                    <Calendar size={16} />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">Enrollment Date</p>
                                                </div>
                                                <p className="text-lg font-bold text-zinc-100">{new Date(selectedUser.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                            </div>
                                        </div>

                                        {/* Password Reset Component */}
                                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 space-y-4">
                                            <div className="flex items-center gap-3 text-[#C5A059] mb-2">
                                                <Key size={16} />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Authentication Reset</p>
                                            </div>
                                            <form onSubmit={handlePasswordReset} className="flex gap-4 items-center">
                                                <input
                                                    type="text"
                                                    placeholder="Enter new password (min 6 chars)"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C5A059]/50 transition-all font-medium placeholder:text-zinc-600"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isResetting || !newPassword}
                                                    className={`px-6 py-3 bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold text-[10px] tracking-widest uppercase rounded-xl transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    {isResetting ? 'Processing...' : 'Override Key'}
                                                </button>
                                            </form>
                                            <p className="text-[10px] text-zinc-500 font-medium tracking-wide">Assigning a new key will immediately invalidate the current credential tuple.</p>
                                        </div>
                                    </div>

                                    {/* Danger Zone */}
                                    <div className="p-8 border border-red-500/10 bg-red-500/5 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                        <div className="flex items-start gap-4">
                                            <Shield size={24} className="text-red-500 shrink-0 mt-1" />
                                            <div className="space-y-2">
                                                <p className="text-xs font-black uppercase tracking-widest text-red-500">Danger Zone</p>
                                                <p className="text-[11px] font-medium text-zinc-400 leading-relaxed uppercase tracking-wider max-w-md">Erasing an identity will permanently revoke their access from the system. Use caution.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteUser(selectedUser._id)}
                                            className="px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold text-[10px] tracking-widest uppercase rounded-xl transition-all border border-red-500/20 whitespace-nowrap"
                                        >
                                            Purge User
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 bg-white/[0.01]">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                    <Users size={32} className="opacity-20 text-[#C5A059]" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Select Identity to Inspect</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

const InfoBlock = ({ icon, label, value, isLink, link }: any) => (
    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 hover:border-[#C5A059]/20 transition-all group">
        <div className="flex items-center gap-3 mb-4">
            <span className="text-zinc-600 group-hover:text-[#C5A059] transition-colors">{icon}</span>
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">{label}</p>
        </div>
        {isLink ? (
            <a href={link} className="text-lg font-bold text-white hover:text-[#C5A059] transition-colors truncate block">{value}</a>
        ) : (
            <p className="text-lg font-bold text-white truncate">{value}</p>
        )}
    </div>
);

export default ManageUsers;
