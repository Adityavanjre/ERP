import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../api/config';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, Tag, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

interface BlogPost {
    _id: string;
    title: string;
    slug?: string;
    excerpt: string;
    author: string;
    date: string;
    category: string;
    image: string;
    readTime?: string;
    tags?: string[];
}

const Blog = () => {
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/blogs`);
                setBlogPosts(data || []);
            } catch (err) {
                console.error("Error fetching blogs:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchBlogs();
    }, []);

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white pt-48 pb-32 px-4 relative overflow-hidden">
            <SEO
                title="Boutique Insights | Klypso Resources"
                description="Deep dives into technology architecture, design psychology, and the future of digital product development."
            />

            {/* Noise Overlay */}
            <div className="noise" />

            {/* Atmosphere */}
            <div className="absolute top-[-10%] left-[-10%] w-[60rem] h-[60rem] bg-[#C5A059]/5 rounded-full blur-[200px]" />

            <div className="container mx-auto max-w-7xl relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center mb-32"
                >
                    <div className="flex items-center justify-center gap-4 mb-10">
                        <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                        <span className="text-[10px] font-black tracking-[0.5em] text-[#C5A059] uppercase">
                            Our Resources
                        </span>
                        <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                    </div>
                    <h1 className="text-6xl md:text-[9rem] font-bold mb-12 tracking-tight leading-[0.8] font-heading">
                        Boutique <br />
                        <span className="font-display italic font-light text-[#C5A059]">Insights.</span>
                    </h1>
                    <p className="max-w-3xl mx-auto text-xl md:text-2xl text-zinc-500 font-medium leading-relaxed tracking-tight underline underline-offset-4 decoration-[#C5A059]/20">
                        Sharing our thoughts on <span className="text-white">technology architecture, modern design</span>, and the future of digital products.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-16">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-[500px] bg-white/[0.02] animate-pulse rounded-[3rem]" />
                        ))
                    ) : error ? (
                        <div className="md:col-span-2 lg:col-span-3 text-center py-32 bg-[#121214] border border-white/5 rounded-[3rem]">
                            <p className="text-zinc-600 font-bold uppercase tracking-[0.3em] text-[10px]">Failed to load insights feed. Please try again later.</p>
                        </div>
                    ) : blogPosts.length === 0 ? (
                        <div className="md:col-span-2 lg:col-span-3 text-center py-32 bg-[#121214] border border-white/5 rounded-[3rem]">
                            <p className="text-zinc-600 font-medium italic">Our latest insights are being prepared. Check back soon.</p>
                        </div>
                    ) : (
                        blogPosts.map((post, idx) => (
                            <motion.article
                                key={post._id}
                                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="group flex flex-col h-full bg-[#121214] border border-white/5 rounded-[3rem] overflow-hidden hover:border-[#C5A059]/30 transition-all duration-700 shadow-3xl"
                            >
                                <Link to={`/insights/${post.slug || post._id}`} className="flex flex-col h-full">
                                    <div className="aspect-[16/10] overflow-hidden relative">
                                        <img
                                            src={post.image}
                                            alt={post.title}
                                            className="w-full h-full object-cover grayscale brightness-75 transition-all duration-[1.5s] ease-[0.16, 1, 0.3, 1] group-hover:scale-110 group-hover:grayscale-0 group-hover:brightness-100"
                                        />
                                        <div className="absolute top-8 left-8">
                                            <span className="bg-black/40 backdrop-blur-xl text-[8px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full border border-white/10 flex items-center gap-2 text-[#C5A059]">
                                                <Tag size={10} className="text-[#C5A059]" /> {post.category}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-12 flex flex-col flex-1">
                                        <div className="flex items-center text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-8 gap-8">
                                            <span className="flex items-center gap-3"><Calendar size={12} /> {post.date}</span>
                                            <span className="flex items-center gap-3"><BookOpen size={12} /> {post.readTime || '5 min'}</span>
                                        </div>

                                        <h2 className="text-3xl font-bold mb-6 group-hover:text-[#C5A059] transition-colors leading-tight font-heading tracking-tight underline-offset-8 decoration-[#C5A059]/0 group-hover:decoration-[#C5A059]/20 transition-all duration-500">
                                            {post.title}
                                        </h2>
                                        <p className="text-zinc-500 text-sm mb-10 line-clamp-2 leading-relaxed font-medium">
                                            {post.excerpt}
                                        </p>

                                        {post.tags && post.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-10">
                                                {post.tags.slice(0, 3).map((tag, i) => (
                                                    <span key={i} className="text-[7px] font-black uppercase tracking-[0.2em] text-[#C5A059]/40 py-1 px-2 border border-[#C5A059]/10 rounded-md">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-auto pt-10 border-t border-white/5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 group-hover:text-white transition-all duration-700">
                                            <span className="flex items-center gap-4">
                                                By {post.author}
                                            </span>
                                            <ArrowRight size={16} className="text-[#C5A059] group-hover:translate-x-2 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.article>
                        )))}
                </div>
            </div>
        </div>
    );
};

export default Blog;
