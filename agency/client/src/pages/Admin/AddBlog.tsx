import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Link as LinkIcon, Eye, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageUploader from '../../components/Admin/ImageUploader';

const AddBlog = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [status, setStatus] = useState<'draft' | 'published'>('draft');
    const [category, setCategory] = useState('Insights');
    const [image, setImage] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [content, setContent] = useState('');
    const [author, setAuthor] = useState(user?.name || 'Team Klypso');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [readTime, setReadTime] = useState('3 min read');
    const [tags, setTags] = useState('');

    const categories = ['Tech', 'Design', 'Marketing', 'Business', 'Agency', 'Culture', 'Architecture', 'Strategy', 'Insights', 'Engineering', 'Security'];

    // Auto-generate slug from title
    useEffect(() => {
        const generatedSlug = title.toLowerCase()
            .replace(/[^\w ]+/g, '')
            .replace(/ +/g, '-');
        setSlug(generatedSlug);
    }, [title]);

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image', 'code-block'],
            ['clean']
        ],
    };

    const quillFormats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet',
        'link', 'image', 'code-block'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.post('/blogs', {
                title,
                slug,
                status,
                category,
                image,
                excerpt,
                content,
                author,
                readTime,
                tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
            });

            navigate('/admin/blogs');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to publish post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <button
                            onClick={() => navigate('/admin/blogs')}
                            className="text-zinc-500 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all mb-4 group"
                        >
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Library
                        </button>
                        <h1 className="text-4xl font-bold font-heading tracking-tight flex items-center gap-4">
                            Content Workstation
                            <span className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border ${status === 'published' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' : 'border-amber-500/30 text-amber-500 bg-amber-500/5'}`}>
                                {status}
                            </span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={(e) => { setStatus(status === 'published' ? 'draft' : 'published'); handleSubmit(e); }}
                            className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all"
                        >
                            <Save size={16} className="text-[#C5A059]" /> Save as {status === 'published' ? 'Draft' : 'Published'}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-[#C5A059] hover:bg-[#D4AF37] text-black px-8 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#C5A059]/10"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
                            Broadcast Insight
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl mb-8 flex items-center gap-3 text-sm font-medium">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Primary Content Area */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-[#141417] border border-white/5 rounded-[2rem] p-10 space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Eye size={12} className="text-[#C5A059]" /> Article Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-transparent border-none p-0 text-4xl font-bold text-white focus:outline-none focus:ring-0 placeholder-zinc-800 font-heading tracking-tight"
                                    placeholder="Enter captivating headline..."
                                    required
                                />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    Content Narrative
                                </label>
                                <div className="quill-editor-wrapper">
                                    <ReactQuill
                                        theme="snow"
                                        value={content}
                                        onChange={setContent}
                                        modules={quillModules}
                                        formats={quillFormats}
                                        placeholder="Begin your expert narrative here..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#141417] border border-white/5 rounded-[2rem] p-10 space-y-6">
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Boutique Excerpt</label>
                            <textarea
                                value={excerpt}
                                onChange={(e) => setExcerpt(e.target.value)}
                                rows={3}
                                className="w-full bg-black/20 border border-white/5 rounded-2xl p-6 text-zinc-400 focus:outline-none focus:border-[#C5A059]/30 transition-all text-sm leading-relaxed"
                                placeholder="A sophisticated hook for the reader..."
                                required
                            />
                        </div>
                    </div>

                    {/* Sidebar Configuration */}
                    <div className="space-y-8">
                        <div className="bg-[#141417] border border-white/5 rounded-[2rem] p-8 space-y-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C5A059] border-b border-white/5 pb-4">Metadata Engine</h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">URL Identifier (Slug)</label>
                                    <div className="relative group">
                                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#C5A059] transition-colors" size={12} />
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-[11px] font-mono text-zinc-500 focus:outline-none focus:border-[#C5A059]/30 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Asset Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-bold text-white focus:outline-none focus:border-[#C5A059]/30 transition-all appearance-none cursor-pointer"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat} className="bg-zinc-900">{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <ImageUploader
                                        label="Cover Visualization"
                                        onUploadSuccess={(url) => setImage(url)}
                                        existingImage={image}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#141417] border border-white/5 rounded-[2rem] p-8 space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C5A059] border-b border-white/5 pb-4">Insight Settings</h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Read Duration</label>
                                    <input
                                        type="text"
                                        value={readTime}
                                        onChange={(e) => setReadTime(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[11px] text-white focus:outline-none focus:border-[#C5A059]/30 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Tag Cloud</label>
                                    <input
                                        type="text"
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[11px] text-white focus:outline-none focus:border-[#C5A059]/30 transition-all font-mono"
                                        placeholder="comma, separated, tags"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Attribution</label>
                                    <input
                                        type="text"
                                        value={author}
                                        onChange={(e) => setAuthor(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[11px] text-zinc-400 focus:outline-none focus:border-[#C5A059]/30 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AddBlog;
