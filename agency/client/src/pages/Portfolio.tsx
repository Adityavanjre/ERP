import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../api/config';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import type { Project } from '../types';
import { ArrowRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

import projectsData from '../data/projects.json';

const Portfolio = () => {
    const [projects, setProjects] = useState<Project[]>(projectsData as any);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/projects`);
                if (data && data.length > 0) {
                    setProjects(data);
                }
            } catch (err) {
                console.error("Error fetching projects", err);
            }
        };
        fetchProjects();
    }, []);

    const categories = ['All', 'Web', 'App', 'Marketing', 'Design', 'Cloud', 'Photography'];

    const filteredProjects = filter === 'All'
        ? projects
        : projects.filter(p => p.categories && p.categories.includes(filter));

    return (
        <section className="min-h-screen bg-[#0A0A0B] text-white pt-48 pb-32 px-4 relative overflow-hidden">
            <Helmet>
                <title>Curated Portfolio | Klypso Elite Catalog</title>
                <meta name="description" content="A portfolio of high-end digital artifacts crafted for the world's most ambitious brands." />
            </Helmet>

            {/* Noise Overlay */}
            <div className="noise" />

            {/* Premium Atmosphere */}
            <div className="absolute top-[-10%] right-[-10%] w-[60rem] h-[60rem] bg-[#C5A059]/5 rounded-full blur-[200px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-[#7C3AED]/3 rounded-full blur-[200px]" />

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
                            Case Studies
                        </span>
                        <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                    </div>
                    <h1 className="text-6xl md:text-[10rem] font-bold mb-12 tracking-tight leading-[0.8] font-heading">
                        Our <br />
                        <span className="font-display italic font-light text-[#C5A059]">Work.</span>
                    </h1>
                    <p className="max-w-xl mx-auto text-xl text-zinc-500 font-medium leading-relaxed tracking-tight underline underline-offset-4 decoration-[#C5A059]/20">
                        A showcase of high-performance web systems and bespoke visual identities crafted for growth.
                    </p>
                </motion.div>

                {/* Technical Filter Bar */}
                <div className="sticky top-28 z-40 mb-32 group px-4">
                    <div className="max-w-fit mx-auto bg-black/40 backdrop-blur-3xl border border-white/5 p-2 rounded-full flex items-center gap-2 shadow-3xl hover:border-[#C5A059]/30 transition-all duration-500">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth px-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setFilter(cat)}
                                    className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${filter === cat
                                        ? 'bg-[#C5A059] text-black shadow-xl shadow-[#C5A059]/10'
                                        : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grid of Projects */}
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredProjects.map((project, idx) => (
                            <ProjectCard key={project._id || project.id} project={project} index={idx} />
                        ))}
                    </AnimatePresence>
                </motion.div>

                {/* Grand Exit CTA */}
                <div className="mt-60 text-center relative flex flex-col items-center">
                    <h2 className="text-5xl md:text-8xl font-bold mb-16 tracking-tight font-heading leading-none">Let's Build <br /><span className="font-display italic font-light text-[#C5A059]">Something New.</span></h2>
                    <Link
                        to="/contact"
                        className="btn-lux px-16 h-20 text-md"
                    >
                        Start Your Project <ArrowRight className="ml-4 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </section>
    );
};

const ProjectCard = ({ project, index }: { project: Project, index: number }) => (
    <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
        className="group relative flex flex-col h-full rounded-[3rem] overflow-hidden bg-[#121214] border border-white/5 hover:border-[#C5A059]/30 transition-all duration-700 shadow-3xl"
    >
        <Link to={`/project/${project._id || project.id}`} className="flex flex-col h-full">
            <div className="aspect-[4/5] w-full relative overflow-hidden">
                <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover grayscale brightness-75 transition-all duration-[2s] ease-[0.2, 1, 0.3, 1] group-hover:scale-110 group-hover:grayscale-0 group-hover:brightness-100"
                />

                {/* Technical Overlay */}
                <div className="absolute inset-x-10 bottom-10 p-10 bg-black/40 backdrop-blur-2xl border border-white/5 rounded-3xl translate-y-10 group-hover:translate-y-0 transition-all duration-700 opacity-0 group-hover:opacity-100 shadow-2xl">
                    <div className="flex gap-3 mb-6">
                        {project.categories?.slice(0, 2).map((cat, i) => (
                            <span key={i} className="px-3 py-1 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-lg text-[8px] font-black uppercase tracking-widest text-[#C5A059]">
                                {cat}
                            </span>
                        ))}
                    </div>

                    <h3 className="text-3xl font-bold text-white mb-4 tracking-tight font-heading">
                        {project.title}
                    </h3>

                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-[#C5A059] transition-all">
                        View Project Details <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                    </div>
                </div>



                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-0 transition-opacity" />
            </div>
        </Link>
    </motion.div >
);

export default Portfolio;
