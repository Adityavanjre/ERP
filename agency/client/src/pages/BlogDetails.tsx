import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../api/config';
import { useParams, Link } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Calendar, ArrowLeft, Tag, Share2, BookOpen } from 'lucide-react';
import Loader from '../components/Loader';
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
    content: string;
    readTime?: string;
    tags?: string[];
}

const BlogDetails = () => {
    const { id } = useParams();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    useEffect(() => {
        const fetchPostAndRelated = async () => {
            try {
                // Fetch the main article
                const { data } = await axios.get(`${API_URL}/api/blogs/${id}`);
                setPost(data);

                // Fetch all articles for the "Related" section
                const { data: allBlogs } = await axios.get(`${API_URL}/api/blogs`);
                const filtered = allBlogs
                    .filter((b: BlogPost) => b._id !== data._id)
                    .slice(0, 3);
                setRelatedPosts(filtered);
            } catch (err) {
                console.error("Error fetching blog post data:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchPostAndRelated();
        // Scroll to top on load
        window.scrollTo(0, 0);
    }, [id]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#0A0A0B]"><Loader /></div>;
    if (error || !post) return <div className="h-screen flex flex-col items-center justify-center bg-[#0A0A0B] text-white">
        <h1 className="text-4xl font-bold mb-4 font-heading">Article Not Found</h1>
        <Link to="/resources" className="text-[#C5A059] font-black uppercase tracking-[0.2em] text-[10px] hover:underline">Back to Insights</Link>
    </div>;

    const sharePost = () => {
        if (navigator.share) {
            navigator.share({
                title: post.title,
                url: window.location.href,
            }).catch(console.error);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white pt-48 pb-32 relative overflow-hidden">
            <SEO
                title={`${post.title} | Technical Insight`}
                description={post.excerpt}
            />

            {/* Reading Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-[#C5A059] origin-left z-[100]"
                style={{ scaleX }}
            />

            {/* Noise Overlay */}
            <div className="noise" />

            {/* Atmosphere */}
            <div className="absolute top-[-10%] right-[-10%] w-[60rem] h-[60rem] bg-[#C5A059]/5 rounded-full blur-[200px]" />

            <div className="container mx-auto max-w-5xl px-6 relative z-10">
                <Link to="/resources" className="inline-flex items-center gap-4 text-zinc-500 hover:text-white mb-16 transition-all group px-8 py-4 rounded-full bg-white/[0.02] border border-white/5 backdrop-blur-3xl">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Back to Insights</span>
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className="flex flex-wrap items-center gap-6 mb-12">
                        <span className="bg-[#C5A059] text-black text-[9px] font-black uppercase tracking-widest px-6 py-2 rounded-xl flex items-center gap-2 shadow-xl shadow-[#C5A059]/10">
                            <Tag size={12} /> {post.category}
                        </span>
                        <div className="h-[1px] w-12 bg-white/10 hidden sm:block" />
                        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <Calendar size={14} /> {post.date}
                        </span>
                        <div className="h-[1px] w-6 bg-white/10 hidden sm:block" />
                        <span className="text-[#C5A059]/60 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <BookOpen size={14} /> {post.readTime || '5 min read'}
                        </span>
                    </div>

                    <h1 className="text-5xl md:text-[5vw] font-bold mb-12 leading-[1.1] font-heading tracking-tight">
                        {post.title}
                    </h1>

                    <div className="flex items-center justify-between mb-20 py-10 border-y border-white/5">
                        <div className="flex items-center gap-8">
                            <div className="w-16 h-16 rounded-2xl bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center font-black text-[#C5A059] text-2xl">
                                {post.author.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-white text-lg font-heading">{post.author}</p>
                                <p className="text-[#C5A059] text-[9px] font-black uppercase tracking-[0.4em]">Managing Partner</p>
                            </div>
                        </div>
                        <button onClick={sharePost} className="w-14 h-14 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-[#C5A059] hover:border-[#C5A059]/30 transition-all group">
                            <Share2 size={24} className="group-hover:rotate-12 transition-transform" />
                        </button>
                    </div>

                    <div className="aspect-video rounded-[3rem] overflow-hidden mb-20 border border-white/5 shadow-3xl bg-[#121214]">
                        <img src={post.image} alt={post.title} className="w-full h-full object-cover grayscale brightness-75 hover:grayscale-0 hover:brightness-100 transition-all duration-1000" />
                    </div>

                    <div className="prose prose-invert prose-gold max-w-none">
                        <div className="text-2xl text-zinc-400 italic mb-16 leading-relaxed font-medium border-l-2 border-[#C5A059] pl-10 font-display">
                            {post.excerpt}
                        </div>
                        <div
                            className="text-zinc-400 leading-loose space-y-12 text-xl font-medium"
                            dangerouslySetInnerHTML={{ __html: post.content || '<p>Detailed content for this article is coming soon. Stay tuned for expert insights and deep dives into this topic.</p>' }}
                        />
                    </div>

                    {/* Author Signature Section */}
                    <div className="mt-32 p-12 bg-[#121214] border border-white/5 rounded-[3rem] flex flex-col md:flex-row items-center gap-12 group hover:border-[#C5A059]/30 transition-all duration-700">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center font-black text-[#C5A059] text-4xl group-hover:bg-[#C5A059] group-hover:text-black transition-all duration-500">
                                {post.author.charAt(0)}
                            </div>
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#C5A059] mb-4">About the Author</h4>
                            <h3 className="text-2xl font-bold mb-4 font-heading">{post.author}</h3>
                            <p className="text-zinc-500 leading-relaxed max-w-xl font-medium">
                                Architecting the future of digital experiences at Klypso. Focused on the intersection of technical excellence, aesthetic psychology, and high-performance engineering.
                            </p>
                        </div>
                    </div>

                    {post.tags && post.tags.length > 0 && (
                        <div className="mt-20 flex flex-wrap gap-4 pt-10 border-t border-white/5">
                            {post.tags.map((tag, i) => (
                                <span key={i} className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C5A059]/40 py-2 px-4 border border-[#C5A059]/10 rounded-full bg-[#C5A059]/5">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Related Insights Section */}
                    {relatedPosts.length > 0 && (
                        <div className="mt-40">
                            <div className="flex items-center gap-8 mb-16">
                                <h2 className="text-4xl font-bold font-heading shrink-0 tracking-tight">Expand Your Knowledge.</h2>
                                <div className="h-[1px] flex-1 bg-white/5" />
                                <Link to="/resources" className="text-[10px] font-black uppercase tracking-widest text-[#C5A059] hover:text-white transition-colors underline underline-offset-8">Explore All</Link>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8">
                                {relatedPosts.map((rPost) => (
                                    <Link
                                        key={rPost._id}
                                        to={`/insights/${rPost.slug || rPost._id}`}
                                        className="group block bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 hover:border-[#C5A059]/30 transition-all duration-500"
                                    >
                                        <div className="aspect-video rounded-2xl overflow-hidden mb-6">
                                            <img src={rPost.image} alt="" className="w-full h-full object-cover grayscale brightness-75 group-hover:scale-110 group-hover:grayscale-0 transition-all duration-700" />
                                        </div>
                                        <h4 className="text-[9px] font-black text-[#C5A059] uppercase tracking-widest mb-4">{rPost.category}</h4>
                                        <h3 className="font-bold text-lg mb-4 leading-snug font-heading group-hover:text-[#C5A059] transition-colors">{rPost.title}</h3>
                                        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-zinc-600">
                                            <span>{rPost.readTime || '4 min'} read</span>
                                            <ArrowLeft size={12} className="rotate-180 text-[#C5A059]" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-40 pt-20 border-t border-white/5 text-center px-8 md:px-20 py-20 bg-[#121214] rounded-[4rem] border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C5A059]/5 rounded-full blur-[100px] -z-10" />
                        <h3 className="text-4xl md:text-6xl font-bold mb-8 font-heading tracking-tight">Stay Informed.</h3>
                        <p className="text-zinc-500 mb-12 text-lg font-medium max-w-xl mx-auto">Join our newsletter to receive the latest updates on technology, design, and digital strategy.</p>
                        <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-xl mx-auto">
                            <input
                                type="email"
                                placeholder="Enter your email address..."
                                className="bg-black/40 border border-white/5 px-10 py-5 rounded-2xl focus:outline-none focus:border-[#C5A059]/30 flex-1 text-sm font-medium transition-all"
                            />
                            <button className="btn-lux px-12 h-16 text-xs">Subscribe</button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default BlogDetails;
