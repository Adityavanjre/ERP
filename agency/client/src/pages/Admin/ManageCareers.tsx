import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../api/config';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Briefcase, MapPin, Clock, Search, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Job {
    _id: string;
    role: string;
    type: string;
    location: string;
    isActive: boolean;
    createdAt: string;
}

const ManageCareers = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/jobs`);
                setJobs(data);
            } catch (error) {
                console.error("Failed to fetch jobs", error);
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        if (!window.confirm('Erase this recruitment record?')) return;
        try {
            const config = {
                headers: { Authorization: `Bearer ${user?.token}` },
            };
            await axios.delete(`${API_URL}/api/jobs/${id}`, config);
            setJobs(prev => prev.filter(j => j._id !== id));
        } catch (error) {
            console.error("Failed to delete job", error);
        }
    };

    const filteredJobs = jobs.filter(j =>
        j.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 gap-4">
            <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold uppercase tracking-widest text-pink-500/50">Querying Talent Pool...</p>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Career Opportunities</h1>
                    <p className="text-zinc-500 text-sm font-medium">Recruit and manage top-tier talent for the Klypso roster.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                        <input
                            type="text"
                            placeholder="Search roles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#141417] border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-pink-500/50 transition-all font-medium w-48 md:w-64"
                        />
                    </div>
                    <Link to="/admin/add-job" className="bg-pink-600 hover:bg-pink-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-pink-600/10">
                        <Plus size={16} /> Post Vacancy
                    </Link>
                </div>
            </div>

            <div className="bg-[#141417] border border-white/5 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/20">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">Role_Classification</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">Details</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        <AnimatePresence>
                            {filteredJobs.length > 0 ? filteredJobs.map((job) => (
                                <motion.tr
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    key={job._id}
                                    className="hover:bg-white/[0.01] transition-colors group"
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/10 flex items-center justify-center text-pink-500 shadow-inner">
                                                <Briefcase size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-pink-400 transition-colors">{job.role}</p>
                                                <p className="text-[10px] text-zinc-500 font-medium">Recruitment ID: {job._id.slice(-6).toUpperCase()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium"><Clock size={14} className="text-zinc-600" /> {job.type}</div>
                                            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium"><MapPin size={14} className="text-zinc-600" /> {job.location}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${job.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-zinc-700'}`} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${job.isActive ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                                {job.isActive ? 'Live' : 'Hidden'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button className="p-2 text-zinc-600 hover:text-white transition-colors"><Edit size={16} /></button>
                                            <button onClick={(e) => handleDelete(job._id, e)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </motion.tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <Briefcase size={40} className="mx-auto text-zinc-800 mb-6" />
                                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No active recruitment detected</p>
                                    </td>
                                </tr>
                            )}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManageCareers;
