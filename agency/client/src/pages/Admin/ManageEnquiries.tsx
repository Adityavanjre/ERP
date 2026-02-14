import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../api/config';
import { useAuth } from '../../contexts/AuthContext';
import { Trash2, Mail, Calendar, Search, Users, ExternalLink, MessageSquare, Briefcase, DollarSign, ChevronRight, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Enquiry {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    service: string;
    projectType?: string;
    budget?: string;
    timeline?: string;
    message: string;
    referenceLinks?: string[];
    createdAt: string;
}

const ManageEnquiries = () => {
    const { user } = useAuth();
    const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selectedEnquiry = enquiries.find(e => e._id === selectedId);

    useEffect(() => {
        if (user) fetchEnquiries();
    }, [user]);

    const fetchEnquiries = async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user?.token}` },
            };
            const { data } = await axios.get(`${API_URL}/api/enquiries`, config);
            setEnquiries(data);
            if (data.length > 0) setSelectedId(data[0]._id);
        } catch (error) {
            console.error('Error fetching enquiries', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Erase this enquiry from history?')) return;

        try {
            const config = {
                headers: { Authorization: `Bearer ${user?.token}` },
            };
            await axios.delete(`${API_URL}/api/enquiries/${id}`, config);
            setEnquiries(prev => prev.filter(enq => enq._id !== id));
            if (selectedId === id) setSelectedId(null);
        } catch (error) {
            console.error('Error deleting enquiry', error);
        }
    };

    const filteredEnquiries = enquiries.filter(enq =>
        enq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enq.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enq.service.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 gap-4">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold uppercase tracking-widest">Scanning Intel...</p>
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
                            <h2 className="font-bold flex items-center gap-2"><Inbox size={18} className="text-indigo-400" /> Inbox</h2>
                            <span className="bg-white/5 px-2 py-0.5 rounded-md text-[10px] font-bold text-zinc-400">{filteredEnquiries.length} Logs</span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                            <input
                                type="text"
                                placeholder="Filter results..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                            />
                        </div>
                    </div>

                    {/* The List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {filteredEnquiries.length === 0 ? (
                            <div className="text-center py-20 text-zinc-600 font-medium text-xs">No records matching query</div>
                        ) : (
                            filteredEnquiries.map((enq) => (
                                <button
                                    key={enq._id}
                                    onClick={() => setSelectedId(enq._id)}
                                    className={`w-full text-left p-4 rounded-xl transition-all border group relative ${selectedId === enq._id ? 'bg-indigo-600/10 border-indigo-500/20 shadow-lg shadow-indigo-500/5' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`font-bold text-sm tracking-tight ${selectedId === enq._id ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>{enq.name}</h3>
                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${selectedId === enq._id ? 'text-indigo-400' : 'text-zinc-600'}`}>{new Date(enq.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedId === enq._id ? 'text-indigo-300/60' : 'text-zinc-500'}`}>{enq.service}</p>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="text-zinc-600"><ChevronRight size={14} /></div>
                                        </div>
                                    </div>
                                    {selectedId === enq._id && (
                                        <motion.div layoutId="selected-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Details Column */}
                <div className="flex-1 flex flex-col bg-[#141417] border border-white/5 rounded-2xl overflow-hidden shadow-sm relative">
                    <AnimatePresence mode="wait">
                        {selectedEnquiry ? (
                            <motion.div
                                key={selectedEnquiry._id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex-1 flex flex-col overflow-hidden"
                            >
                                {/* Detail Header */}
                                <div className="p-8 border-b border-white/5 bg-black/10 flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/10">Inbound Intel</span>
                                            <span className="text-zinc-700 text-xs">/</span>
                                            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{selectedEnquiry._id}</span>
                                        </div>
                                        <h2 className="text-3xl font-bold text-white tracking-tight">{selectedEnquiry.service}</h2>
                                        <p className="text-zinc-500 text-xs font-medium flex items-center gap-2">
                                            {selectedEnquiry.projectType || 'General Request'} • Received {new Date(selectedEnquiry.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(selectedEnquiry._id, e)}
                                        className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all group"
                                        title="Purge Record"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                {/* Detail Content */}
                                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                    {/* Primary Info Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <InfoBlock icon={<Users size={16} />} label="Full Name" value={selectedEnquiry.name} />
                                        <InfoBlock icon={<Mail size={16} />} label="Email Address" value={selectedEnquiry.email} isLink link={`mailto:${selectedEnquiry.email}`} />
                                        <InfoBlock icon={<DollarSign size={16} />} label="Budget Allocation" value={selectedEnquiry.budget || 'Unspecified'} />
                                    </div>

                                    {/* Message Section */}
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-2">
                                            <MessageSquare size={14} /> Transmission Context
                                        </h3>
                                        <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-sm text-zinc-300 leading-relaxed font-medium whitespace-pre-wrap">
                                            {selectedEnquiry.message}
                                        </div>
                                    </div>

                                    {/* Assets Section */}
                                    {selectedEnquiry.referenceLinks && selectedEnquiry.referenceLinks.length > 0 && selectedEnquiry.referenceLinks[0] !== "" && (
                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-2">
                                                <ExternalLink size={14} /> Referenced Assets
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {selectedEnquiry.referenceLinks.map((link, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={link.startsWith('http') ? link : `https://${link}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl text-indigo-400 hover:bg-indigo-600/10 hover:border-indigo-500/20 transition-all font-bold text-xs"
                                                    >
                                                        <span className="truncate pr-4">{link}</span>
                                                        <ExternalLink size={14} className="shrink-0" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Extended Metadata */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                        <InfoBlock icon={<Calendar size={16} />} label="Target Timeline" value={selectedEnquiry.timeline || 'On Demand'} />
                                        <InfoBlock icon={<Briefcase size={16} />} label="Project Classification" value={selectedEnquiry.projectType || 'Standard'} />
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 bg-white/[0.01]">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                    <Inbox size={32} className="opacity-20" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Select transmission to view</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

const InfoBlock = ({ icon, label, value, isLink, link }: any) => (
    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
        <div className="flex items-center gap-3 mb-2">
            <span className="text-zinc-600">{icon}</span>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{label}</p>
        </div>
        {isLink ? (
            <a href={link} className="text-sm font-bold text-white hover:text-indigo-400 transition-colors truncate block">{value}</a>
        ) : (
            <p className="text-sm font-bold text-white truncate">{value}</p>
        )}
    </div>
);

export default ManageEnquiries;
