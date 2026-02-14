import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../api/config';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Trash2, Plus, ExternalLink, Edit, FolderOpen, LayoutGrid, List, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Project {
    _id: string;
    title: string;
    description: string;
    categories: string[];
    image: string;
    link?: string;
}

const ManageProjects = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/projects`);
                setProjects(data);
            } catch (error) {
                console.error("Failed to fetch projects", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        if (!window.confirm('Erase this project from the showcase?')) return;
        try {
            const config = {
                headers: { Authorization: `Bearer ${user?.token}` },
            };
            await axios.delete(`${API_URL}/api/projects/${id}`, config);
            setProjects(prev => prev.filter(p => p._id !== id));
        } catch (error) {
            console.error("Failed to delete project", error);
        }
    };

    const filteredProjects = projects.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categories.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest">Loading Portfolio...</p>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header / Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Project Showcase</h1>
                    <p className="text-zinc-500 text-sm font-medium">Manage and deploy portfolio assets to the front-end.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                        <input
                            type="text"
                            placeholder="Find project..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#141417] border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium w-48 md:w-64"
                        />
                    </div>

                    <div className="flex bg-[#141417] rounded-xl p-1 border border-white/5">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>

                    <Link to="/admin/add-project" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/10">
                        <Plus size={16} />
                        Deploy New
                    </Link>
                </div>
            </div>

            {/* Content View */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence>
                        {filteredProjects.map((project, idx) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={project._id}
                                className="group bg-[#141417] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all flex flex-col shadow-sm"
                            >
                                <div className="h-48 relative overflow-hidden">
                                    <img src={project.image} alt={project.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                                        {project.link && (
                                            <a href={project.link} target="_blank" rel="noreferrer" className="p-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-all shadow-xl" title="View Live">
                                                <ExternalLink size={16} />
                                            </a>
                                        )}
                                        <Link to={`/admin/edit-project/${project._id}`} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all shadow-xl" title="Edit Content">
                                            <Edit size={16} />
                                        </Link>
                                        <button onClick={(e) => handleDelete(project._id, e)} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-all shadow-xl" title="Delete Asset">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="font-bold text-white mb-2 line-clamp-1">{project.title}</h3>
                                    <p className="text-zinc-500 text-xs font-medium line-clamp-2 mb-6 flex-1">{project.description}</p>
                                    <div className="flex flex-wrap gap-2 mt-auto">
                                        {project.categories.slice(0, 2).map((cat, i) => (
                                            <span key={i} className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-black text-zinc-400 border border-white/5">
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="bg-[#141417] border border-white/5 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/20">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">Asset</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">Categories</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredProjects.map((project) => (
                                <tr key={project._id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <img src={project.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/5" />
                                            <div>
                                                <p className="text-sm font-bold text-white">{project.title}</p>
                                                <p className="text-[10px] text-zinc-500 font-medium truncate max-w-xs">{project.description}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1 flex-wrap">
                                            {project.categories.map((cat, i) => (
                                                <span key={i} className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-black border border-white/5 text-zinc-500">{cat}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link to={`/admin/edit-project/${project._id}`} className="p-2 text-zinc-500 hover:text-white transition-colors"><Edit size={16} /></Link>
                                            <button onClick={(e) => handleDelete(project._id, e)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {filteredProjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 bg-white/[0.02] rounded-3xl border border-dashed border-white/5 text-center">
                    <FolderOpen size={40} className="text-zinc-700 mb-4" />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-8">No matching records detected</p>
                    <Link to="/admin/add-project" className="text-indigo-400 hover:text-white font-bold underline transition-colors">Create primary asset</Link>
                </div>
            )}
        </div>
    );
};

export default ManageProjects;
