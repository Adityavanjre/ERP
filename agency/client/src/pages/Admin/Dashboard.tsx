import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../api/config';
import { Link } from 'react-router-dom';
import {
    Users,
    Briefcase,
    FileText,
    Images,
    TrendingUp,
    ArrowUpRight,
    ChevronRight,
    Plus,
    Send,
    Crown,
    Shield,
    Lock
} from 'lucide-react';

interface Enquiry {
    _id: string;
    name: string;
    service: string;
    email: string;
    createdAt: string;
}

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        projects: 0,
        enquiries: 0,
        blogs: 0,
        jobs: 0,
        visits: 12482
    });
    const [recentEnquiries, setRecentEnquiries] = useState<Enquiry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user?.token}` } };
                const [projects, blogs, jobs] = await Promise.all([
                    axios.get(`${API_URL}/api/projects`),
                    axios.get(`${API_URL}/api/blogs`),
                    axios.get(`${API_URL}/api/jobs`)
                ]);

                let enquiriesCount = 0;
                let enquiriesList: Enquiry[] = [];

                try {
                    const enquiriesRes = await axios.get<Enquiry[]>(`${API_URL}/api/enquiries`, config);
                    enquiriesCount = enquiriesRes.data.length;
                    enquiriesList = enquiriesRes.data.slice(0, 5);
                } catch (e) { }

                setStats({
                    projects: projects.data.length,
                    enquiries: enquiriesCount,
                    blogs: blogs.data.length,
                    jobs: jobs.data.length,
                    visits: 12482
                });
                setRecentEnquiries(enquiriesList);
            } catch (error) {
                console.error("Dashboard fetch error", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchData();
    }, [user]);

    if (loading) return null;

    return (
        <div className="space-y-12 pb-20">
            <Helmet>
                <title>Overview | Executive Control</title>
            </Helmet>

            {/* Title & Rapid Stats Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
                <div>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-3 font-heading">
                        Imperial <span className="text-[#C5A059] italic font-display font-medium">Nexus</span>
                    </h1>
                    <p className="text-zinc-500 text-sm font-medium tracking-wide">Command center for Klypso digital operations.</p>
                </div>

                <div className="flex flex-wrap items-center gap-6 sm:gap-12 bg-white/[0.01] border border-white/5 p-6 rounded-3xl lg:rounded-[2rem] backdrop-blur-md">
                    <RapidStat label="Active Nodes" value="23" color="text-zinc-100" />
                    <div className="w-[1px] h-10 bg-white/5" />
                    <RapidStat label="Traffic Flux" value="+12.4%" color="text-[#C5A059]" />
                    <div className="w-[1px] h-10 bg-white/5" />
                    <RapidStat label="Uptime" value="100%" color="text-emerald-500" />
                </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <MetricCard
                    title="Asset Library"
                    value={stats.projects}
                    icon={<Images size={24} />}
                    trend="Full Production"
                    accent="#C5A059"
                />
                <MetricCard
                    title="Uplink Signals"
                    value={stats.enquiries}
                    icon={<Send size={24} />}
                    trend="Priority Queue"
                    accent="#7C3AED"
                />
                <MetricCard
                    title="Knowledge Base"
                    value={stats.blogs}
                    icon={<FileText size={24} />}
                    trend="System Intel"
                    accent="#E2E2E2"
                />
                <MetricCard
                    title="Talent Ops"
                    value={stats.jobs}
                    icon={<Briefcase size={24} />}
                    trend="Active Hiring"
                    accent="#C5A059"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Visual Analytics */}
                <div className="xl:col-span-8 space-y-10">
                    <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] overflow-hidden group shadow-2xl">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-3 font-heading"><TrendingUp size={20} className="text-[#C5A059]" /> Growth Trajectory</h3>
                                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-1">Market Performance Delta</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-5 py-2 text-[10px] font-black uppercase tracking-widest bg-[#C5A059] text-black rounded-xl">Yearly</button>
                                <button className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Quarterly</button>
                            </div>
                        </div>
                        <div className="p-8 sm:p-12 h-80 flex items-end gap-1.5 sm:gap-3 px-6 sm:px-10">
                            {[40, 65, 35, 90, 50, 85, 75, 95, 45, 70, 80, 100].map((h, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-4 group/bar">
                                    <div className="w-full relative h-full flex items-end">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${h}%` }}
                                            transition={{ delay: i * 0.05, duration: 1, ease: [0.2, 1, 0.3, 1] }}
                                            className="w-full bg-white/[0.03] group-hover/bar:bg-[#C5A059]/40 rounded-t-xl transition-all border-t border-transparent group-hover/bar:border-[#C5A059]/50 relative"
                                        >
                                            {h > 80 && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 opacity-0 group-hover/bar:opacity-100 transition-opacity text-[9px] font-black text-[#C5A059]">PEAK</div>}
                                        </motion.div>
                                    </div>
                                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-tighter transition-colors group-hover/bar:text-white">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Table of Signals */}
                    <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
                            <h3 className="font-bold text-lg flex items-center gap-3 font-heading"><Send size={20} className="text-[#7C3AED]" /> Live Pipeline</h3>
                            <Link to="/admin/enquiries" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C5A059] flex items-center gap-2 hover:opacity-70 transition-opacity">
                                Access Full Ledger <ArrowUpRight size={14} />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-black/40">
                                        <th className="px-4 sm:px-8 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Client Node</th>
                                        <th className="px-4 sm:px-8 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Classification</th>
                                        <th className="px-4 sm:px-8 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Timestamp</th>
                                        <th className="px-4 sm:px-8 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {recentEnquiries.map((enq) => (
                                        <tr key={enq._id} className="hover:bg-white/[0.01] transition-colors group">
                                            <td className="px-4 sm:px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center font-black text-zinc-500 group-hover:text-[#C5A059] group-hover:border-[#C5A059]/30 transition-all">
                                                        {enq.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white mb-0.5">{enq.name}</p>
                                                        <p className="text-[10px] text-zinc-500 font-medium tracking-tight italic opacity-60">{enq.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 sm:px-8 py-6">
                                                <span className="px-3 py-1 bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20 rounded-lg text-[9px] font-black uppercase tracking-[0.2em]">
                                                    {enq.service}
                                                </span>
                                            </td>
                                            <td className="px-4 sm:px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-zinc-400 font-bold">{new Date(enq.createdAt).toLocaleDateString()}</span>
                                                    <span className="text-[9px] text-zinc-700 font-medium uppercase tracking-widest">{new Date(enq.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 sm:px-8 py-6 text-right">
                                                <Link to="/admin/enquiries" className="p-3 bg-white/5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all inline-block">
                                                    <ChevronRight size={16} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* System Diagnostics Sidebar */}
                <div className="xl:col-span-4 space-y-10">
                    <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Shield size={120} />
                        </div>
                        <h3 className="text-[11px] font-black text-[#C5A059] uppercase tracking-[0.4em] mb-10 flex items-center gap-3">
                            <Lock size={16} /> Protocol Health
                        </h3>
                        <div className="space-y-10">
                            <DiagRow label="Encryption Layer" status="Hardened" percent={100} color="bg-[#C5A059]" />
                            <DiagRow label="Database Sync" status="Real-time" percent={94} color="bg-emerald-500" />
                            <DiagRow label="Asset CDN" status="Optimized" percent={88} color="bg-[#7C3AED]" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#C5A059] to-[#8C6D31] rounded-[2.5rem] p-10 shadow-3xl shadow-[#C5A059]/10 text-black group relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                        <Crown className="mb-6 opacity-30 group-hover:scale-110 transition-transform" size={40} />
                        <h4 className="text-2xl font-bold tracking-tight mb-3 font-heading">Executive Drive</h4>
                        <p className="text-xs font-semibold leading-relaxed mb-8 opacity-80 uppercase tracking-wide">3 Enterprise positions require your approval as Lead Architect.</p>
                        <Link to="/admin/careers" className="bg-black text-white h-14 w-full rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-zinc-900 transition-all shadow-xl">
                            Talent Review <ChevronRight size={14} />
                        </Link>
                    </div>

                    {/* Quick Executive Actions */}
                    <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-4 font-sans">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 px-6 py-4">Direct Commands</p>
                        <ActionLink icon={<Plus size={18} />} label="Draft Asset" to="/admin/projects" color="text-[#C5A059]" />
                        <ActionLink icon={<FileText size={18} />} label="Write Intel" to="/admin/blogs" color="text-zinc-100" />
                        <ActionLink icon={<Users size={18} />} label="Review Access" to="/admin/settings" color="text-[#7C3AED]" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, icon, trend, accent }: any) => (
    <div className="bg-[#121214] border border-white/5 p-8 rounded-[2.5rem] hover:border-white/10 transition-all group relative overflow-hidden shadow-xl hover:shadow-2xl">
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-10">
                <div style={{ color: accent, backgroundColor: `${accent}10`, borderColor: `${accent}20` }} className={`p-4 rounded-2xl border transition-all duration-700 group-hover:scale-110 group-hover:rotate-6`}>
                    {icon}
                </div>
                <div className="flex flex-col items-end">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mb-2" />
                    <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Tracking</span>
                </div>
            </div>
            <h3 className="text-5xl font-bold text-white tracking-tighter mb-2 group-hover:scale-105 transition-transform origin-left font-heading">{value}</h3>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">{title}</p>
            <div className="h-[1px] w-12 bg-zinc-800 group-hover:w-full transition-all duration-700 mb-4" />
            <p className="text-[10px] font-bold text-zinc-600 italic tracking-tight">{trend}</p>
        </div>
    </div>
);

const RapidStat = ({ label, value, color }: any) => (
    <div className="flex flex-col">
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{label}</span>
        <span className={`text-lg font-bold tracking-tight ${color}`}>{value}</span>
    </div>
);

const DiagRow = ({ label, status, percent, color }: any) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
            <span className="text-[10px] font-bold text-zinc-100">{status}</span>
        </div>
        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${percent}%` }}
                transition={{ duration: 1.5, ease: [0.2, 1, 0.3, 1] }}
                className={`h-full ${color} shadow-[0_0_15px_rgba(0,0,0,0.5)]`}
            />
        </div>
    </div>
);

const ActionLink = ({ icon, label, to, color }: any) => (
    <Link to={to} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/[0.04] transition-all group border border-transparent hover:border-white/5">
        <div className="flex items-center gap-4">
            <span className={`${color} group-hover:scale-110 transition-transform`}>{icon}</span>
            <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">{label}</span>
        </div>
        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-zinc-700" />
    </Link>
);

export default Dashboard;
