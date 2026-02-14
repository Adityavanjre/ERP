import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../api/config';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, ExternalLink, Target,
    Zap, ArrowRight, Layers,
    Cpu, CheckCircle, Crown
} from 'lucide-react';
import SEO from '../components/SEO';
import projectsData from '../data/projects.json';
import NotFound from './NotFound';
import Loader from '../components/Loader';

const ProjectDetails = () => {
    const { id } = useParams();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/projects/${id}`, { timeout: 1500 });
                setProject(data);
            } catch (err) {
                const localProject = (projectsData as any[]).find(p => p.id === id || p._id === id);
                if (localProject) {
                    setProject(localProject);
                } else {
                    setError(true);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [id]);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#0A0A0B]"><Loader /></div>;
    if (error || !project) return <NotFound />;

    return (
        <div ref={containerRef} className="min-h-screen bg-[#0A0A0B] text-white selection:bg-[#C5A059]/30 overflow-x-hidden">
            <SEO
                title={`${project.title} | Technical Case Study`}
                description={project.description}
            />

            <div className="noise" />

            {/* Hero Section - The Project Header */}
            <header className="relative h-screen flex items-end justify-start p-8 md:p-32 overflow-hidden">
                <motion.div
                    style={{ y }}
                    className="absolute inset-0 z-0"
                >
                    <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-full object-cover grayscale brightness-50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/60 to-transparent" />
                </motion.div>

                <motion.div style={{ opacity }} className="relative z-10 max-w-6xl">
                    <Link to="/portfolio" className="inline-flex items-center gap-4 px-8 py-4 rounded-full bg-black/40 border border-white/10 text-zinc-500 hover:text-white mb-16 transition-all backdrop-blur-2xl group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">Back to Projects</span>
                    </Link>

                    <div className="flex gap-4 mb-10">
                        {project.categories?.map((cat: string) => (
                            <span key={cat} className="text-[9px] font-black uppercase tracking-[0.4em] text-[#C5A059] bg-[#C5A059]/10 px-6 py-2 rounded-xl border border-[#C5A059]/20 backdrop-blur-md">
                                {cat}
                            </span>
                        ))}
                    </div>

                    <h1 className="text-6xl md:text-[8vw] font-bold mb-10 tracking-tight leading-[0.85] font-heading">
                        {project.title.split(' ')[0]} <br />
                        <span className="font-display italic font-light text-[#C5A059]">{project.title.split(' ').slice(1).join(' ')}</span>
                    </h1>

                    <p className="max-w-3xl text-xl md:text-2xl text-zinc-500 font-medium leading-relaxed mb-16 tracking-tight">
                        {project.description}
                    </p>
                </motion.div>

                <div className="absolute bottom-20 right-20 hidden lg:flex items-center gap-10">
                    <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700 mb-2">Project Status</div>
                        <div className="text-lg font-bold text-white tracking-widest uppercase font-heading">Case Study Live</div>
                    </div>
                    <div className="w-16 h-16 rounded-full border border-[#C5A059]/30 flex items-center justify-center animate-bounce shadow-2xl shadow-[#C5A059]/10">
                        <ArrowRight size={24} className="rotate-90 text-[#C5A059]" />
                    </div>
                </div>
            </header>

            {/* Main Content Integration */}
            <main className="container mx-auto px-6 py-40 relative">
                <div className="grid lg:grid-cols-12 gap-32">
                    <div className="lg:col-span-8 space-y-60">
                        {/* Detailed Project Info */}
                        <section className="relative">
                            <h2 className="text-4xl md:text-7xl font-bold mb-16 tracking-tighter leading-none font-heading flex items-center gap-6">
                                <span className="text-[#C5A059] italic font-display font-medium">01.</span> Overview
                            </h2>
                            <div className="text-zinc-500 text-xl font-medium leading-loose max-w-4xl">
                                {project.fullDescription || project.description}
                            </div>
                        </section>

                        {/* Implementation details */}
                        <section className="grid md:grid-cols-2 gap-16">
                            <div className="premium-card p-16 group relative overflow-hidden">
                                <Target className="text-[#C5A059] mb-10" size={40} />
                                <h3 className="text-[10px] font-black mb-8 uppercase tracking-[0.4em] text-zinc-600">The Challenge</h3>
                                <p className="text-zinc-400 font-medium leading-relaxed text-lg">
                                    {project.challenge || "Building a high-performance solution that aligns with the brand's vision and performance goals."}
                                </p>
                            </div>
                            <div className="premium-card p-16 group relative overflow-hidden bg-[#121214]">
                                <Zap className="text-[#C5A059] mb-10" size={40} />
                                <h3 className="text-[10px] font-black mb-8 uppercase tracking-[0.4em] text-zinc-600">The Solution</h3>
                                <p className="text-zinc-400 font-medium leading-relaxed text-lg">
                                    {project.solution || "Leveraging modern technologies to deliver a fast, secure, and intuitive user experience."}
                                </p>
                            </div>
                        </section>

                        {/* Visual Gallery */}
                        {project.gallery && project.gallery.length > 0 && (
                            <section className="space-y-16">
                                <div className="flex items-center gap-6 mb-12">
                                    <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-heading">Gallery</h2>
                                </div>
                                <div className="space-y-12">
                                    {project.gallery.map((img: string, idx: number) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 50 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            className="rounded-[3rem] overflow-hidden border border-white/5 group shadow-3xl bg-[#121214]"
                                        >
                                            <img
                                                src={img}
                                                alt={`Project Showcase ${idx + 1}`}
                                                className="w-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-1000"
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Technical Stats (Sidebar) */}
                    <div className="lg:col-span-4 space-y-16">
                        <RegistryCard icon={<Cpu className="text-[#C5A059]" />} title="Technology Stack">
                            <div className="flex flex-wrap gap-2">
                                {project.technologies?.map((tech: string) => (
                                    <span key={tech} className="bg-black/40 border border-white/5 text-zinc-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-[#C5A059]/30 hover:text-white transition-all">
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </RegistryCard>

                        {project.services && project.services.length > 0 && (
                            <RegistryCard icon={<CheckCircle className="text-[#C5A059]" />} title="Services Included">
                                <div className="space-y-4">
                                    {project.services.map((service: string) => (
                                        <div key={service} className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                                            <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full shadow-[0_0_10px_#C5A059]" />
                                            {service}
                                        </div>
                                    ))}
                                </div>
                            </RegistryCard>
                        )}

                        {project.impact && (
                            <RegistryCard icon={<Layers className="text-[#C5A059]" />} title="Project Impact">
                                <p className="text-zinc-400 font-medium italic leading-relaxed text-lg">"{project.impact}"</p>
                            </RegistryCard>
                        )}

                        {project.testimonial && (
                            <div className="premium-card p-12 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-5">
                                    <Crown size={80} />
                                </div>
                                <p className="text-zinc-300 italic mb-10 relative z-10 font-display text-xl leading-relaxed">"{project.testimonial.quote}"</p>
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center font-black text-[#C5A059] text-lg">
                                        {project.testimonial.author[0]}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold uppercase tracking-[0.2em] text-white font-heading">{project.testimonial.author}</div>
                                        <div className="text-[9px] uppercase tracking-[0.4em] text-[#C5A059] font-black mt-1">{project.testimonial.role}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {project.link && (
                            <a href={project.link} target="_blank" rel="noopener noreferrer" className="block group mt-8">
                                <div className="bg-[#C5A059] text-black py-6 px-10 rounded-2xl flex items-center justify-between hover:bg-white transition-all duration-700 shadow-2xl shadow-[#C5A059]/10">
                                    <span className="font-black uppercase tracking-[0.3em] text-[10px]">Visit Live Project</span>
                                    <ExternalLink size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </div>
                            </a>
                        )}
                    </div>
                </div>
            </main>

            {/* Massive Footer CTA */}
            <section className="py-60 border-t border-white/5 bg-black overflow-hidden relative text-center">
                <div className="container mx-auto px-6 max-w-7xl relative z-10">
                    <h2 className="text-5xl md:text-[10rem] font-bold mb-16 tracking-tight leading-none font-heading">Start Your <br /><span className="font-display italic font-light text-[#C5A059]">Legacy.</span></h2>
                    <Link to="/contact" className="btn-lux px-20 h-24 text-lg">
                        Start a Conversation
                    </Link>
                </div>
            </section>
        </div>
    );
};

const RegistryCard = ({ icon, title, children }: any) => (
    <div className="premium-card p-12 space-y-8 bg-[#121214]">
        <div className="flex items-center gap-4 border-b border-white/5 pb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
                {icon}
            </div>
            <h3 className="font-black text-[10px] uppercase tracking-[0.5em] text-zinc-600">{title}</h3>
        </div>
        <div>
            {children}
        </div>
    </div>
);

export default ProjectDetails;
