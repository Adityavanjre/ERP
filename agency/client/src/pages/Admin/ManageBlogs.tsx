import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../api/config';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Edit, FileText, Calendar, Search, User, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


const ManageBlogs = () => {
    const { user } = useAuth();
    const [blogs, setBlogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/blogs`);
                setBlogs(data);
            } catch (error) {
                console.error("Failed to fetch blogs", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBlogs();
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        if (!window.confirm('Wipe this article from the database?')) return;
        try {
            const config = {
                headers: { Authorization: `Bearer ${user?.token}` },
            };
            await axios.delete(`${API_URL}/api/blogs/${id}`, config);
            setBlogs(prev => prev.filter(b => b._id !== id));
        } catch (error) {
            console.error("Failed to delete blog", error);
        }
    };

    const filteredBlogs = blogs.filter(b =>
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 gap-4">
            <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold uppercase tracking-widest text-[#C5A059]/50 font-heading">Curating Boutique Insights...</p>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1 font-heading">Resources Library</h1>
                    <p className="text-zinc-500 text-sm font-medium">Manage and publish your boutique insights and resources.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                        <input
                            type="text"
                            placeholder="Search articles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#141417] border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059]/50 transition-all font-medium w-48 md:w-64"
                        />
                    </div>
                    <Link to="/admin/add-blog" className="bg-[#C5A059] hover:bg-[#D4AF37] text-black px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-[#C5A059]/10">
                        <Plus size={16} /> New Entry
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence>
                    {filteredBlogs.length > 0 ? (
                        filteredBlogs.map((blog, index) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={blog._id}
                                className="group bg-[#141417] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-6 hover:border-[#C5A059]/30 transition-all shadow-sm"
                            >
                                <div className="w-full md:w-72 h-44 rounded-xl overflow-hidden shrink-0 border border-white/5 relative">
                                    <img src={blog.image} alt="" className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
                                    <div className="absolute top-4 left-4">
                                        <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-[#C5A059] text-black rounded shadow-lg font-heading">
                                            {blog.category}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-4 right-4">
                                        <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-black/60 backdrop-blur-md text-[#C5A059] rounded border border-[#C5A059]/20 shadow-lg">
                                            {blog.readTime || '3 min read'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-4 mb-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                        <div className="flex items-center gap-1.5"><Calendar size={12} className="text-[#C5A059]" /> {blog.date}</div>
                                        <div className="flex items-center gap-1.5"><User size={12} className="text-zinc-600" /> BY {blog.author}</div>
                                        <div className={`px-2 py-0.5 rounded border ${blog.status === 'published' ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5' : 'border-amber-500/20 text-amber-500 bg-amber-500/5'}`}>
                                            {blog.status || 'draft'}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3 line-clamp-1 group-hover:text-[#C5A059] transition-colors font-heading tracking-tight">
                                        {blog.title}
                                    </h3>
                                    <p className="text-zinc-500 text-sm font-medium line-clamp-2 max-w-3xl leading-relaxed">{blog.excerpt}</p>

                                    {blog.tags && blog.tags.length > 0 && (
                                        <div className="flex gap-2 mt-4">
                                            {blog.tags.map((tag: string, i: number) => (
                                                <span key={i} className="text-[7px] font-black uppercase tracking-[0.2em] text-[#C5A059]/40 py-1 px-2 border border-[#C5A059]/10 rounded-md bg-[#C5A059]/5">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pl-4 border-l border-white/5 h-20">
                                    <a
                                        href={`/insights/${blog.slug || blog._id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                        title="Preview"
                                    >
                                        <Eye size={18} />
                                    </a>
                                    <Link
                                        to={`/admin/edit-blog/${blog._id}`}
                                        className="p-3 text-zinc-500 hover:text-[#C5A059] hover:bg-[#C5A059]/5 rounded-xl transition-all"
                                        title="Edit"
                                    >
                                        <Edit size={18} />
                                    </Link>
                                    <button
                                        onClick={(e) => handleDelete(blog._id, e)}
                                        className="p-3 text-zinc-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-32 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
                            <FileText size={40} className="text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-600 font-black uppercase tracking-widest text-[10px] mb-8">No articles published yet</p>
                            <Link to="/admin/add-blog" className="text-[#C5A059] hover:text-white font-black uppercase tracking-widest text-[10px] underline transition-colors">Create First Entry</Link>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ManageBlogs;
