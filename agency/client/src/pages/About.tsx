import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Crown, Shield, Star } from 'lucide-react';
import SEO from '../components/SEO';

const About = () => {
    return (
        <section className="min-h-screen bg-[#0A0A0B] text-white pt-48 pb-32 px-4 relative overflow-hidden">
            <Helmet>
                <title>The Heritage | Klypso Elite Collective</title>
                <meta name="description" content="Inside the private digital agency crafting masterpieces for the world's most ambitious brands." />
            </Helmet>

            <SEO
                title="The Elite Standard | About Klypso"
                description="We are a private collective of high-integrity engineers and artists dedicated to digital superiority."
            />

            {/* Noise Overlay */}
            <div className="noise" />

            {/* Atmosphere */}
            <div className="absolute top-[-10%] right-[-10%] w-[60rem] h-[60rem] bg-[#C5A059]/5 rounded-full blur-[200px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-[#7C3AED]/3 rounded-full blur-[200px]" />

            <div className="container mx-auto max-w-7xl relative z-10">
                {/* Hero section with massive editorial style */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center mb-60"
                >
                    <div className="flex items-center justify-center gap-4 mb-10">
                        <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                        <span className="text-[10px] font-black tracking-[0.5em] text-[#C5A059] uppercase">
                            Our Story & Ethos
                        </span>
                        <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                    </div>
                    <h1 className="text-6xl md:text-[11rem] font-bold mb-12 tracking-tight leading-[0.8] font-heading">
                        Built on <br />
                        <span className="font-display italic font-light text-[#C5A059]">Craftsmanship.</span>
                    </h1>
                    <p className="max-w-4xl mx-auto text-xl md:text-2xl text-zinc-500 font-medium leading-relaxed tracking-tight">
                        Klypso is a specialized digital agency born from a passion for detail. We partner with ambitious brands to build <span className="text-white">superior web systems</span> and <span className="text-white">visual identities</span> that define their industry standards.
                    </p>
                </motion.div>

                {/* Core Philosophy Cards */}
                <div className="grid md:grid-cols-2 gap-12 mb-60">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="premium-card p-16 group relative overflow-hidden"
                    >
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#C5A059]/10 rounded-full blur-3xl group-hover:bg-[#C5A059]/20 transition-colors" />
                        <Crown className="w-16 h-16 text-[#C5A059] mb-12 opacity-80" />
                        <h2 className="text-4xl font-bold mb-8 tracking-tight font-heading">Quality Without Compromise</h2>
                        <p className="text-zinc-500 leading-relaxed text-lg font-medium">
                            We believe that every pixel and every line of code should serve a purpose. Our design philosophy is simple: create digital experiences that are as functional as they are beautiful, ensuring long-term value for our clients.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="premium-card p-16 group relative overflow-hidden"
                    >
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#7C3AED]/10 rounded-full blur-3xl group-hover:bg-[#7C3AED]/20 transition-colors" />
                        <Shield className="w-16 h-16 text-[#7C3AED] mb-12 opacity-80" />
                        <h2 className="text-4xl font-bold mb-8 tracking-tight font-heading">Technical Integrity</h2>
                        <p className="text-zinc-500 leading-relaxed text-lg font-medium">
                            Performance, security, and scalability are at the core of our engineering. We build resilient digital ecosystems using modern technologies like the MERN stack, ensuring your brand is prepared for the future.
                        </p>
                    </motion.div>
                </div>

                {/* The Story - High Contrast */}
                <div className="grid lg:grid-cols-2 gap-32 items-center mb-60">
                    <div className="space-y-12">
                        <h2 className="text-5xl md:text-8xl font-bold tracking-tighter leading-none font-heading">A Partnership <br /><span className="font-display italic font-light text-[#C5A059]">Built to Last.</span></h2>
                        <div className="space-y-8 text-zinc-400 text-lg font-medium leading-relaxed">
                            <p>
                                Founded in 2024, Klypso was established to provide a more intentional alternative to high-volume, template-based agencies. We chose to focus on high-end craft, delivering bespoke solutions that prioritize quality over quantity.
                            </p>
                            <p>
                                We operate as a dedicated team for each of our clients. By limiting the number of projects we take on, we ensure that every partnership receives our full creative and technical attention, resulting in exceptional outcomes.
                            </p>
                            <div className="pt-12 flex items-center gap-8">
                                <div className="flex flex-col">
                                    <span className="text-4xl font-bold text-white font-heading">25+</span>
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#C5A059]">Global Projects</span>
                                </div>
                                <div className="w-[1px] h-12 bg-white/5" />
                                <div className="flex flex-col">
                                    <span className="text-4xl font-bold text-white font-heading">25+</span>
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#C5A059]">Experts</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="relative group p-4 border border-white/5 rounded-[4rem]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            className="aspect-[4/5] rounded-[3rem] overflow-hidden bg-[#121214]"
                        >
                            <img
                                src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?q=80&w=2069&auto=format&fit=crop"
                                alt="Modern Digital Agency Workspace"
                                className="w-full h-full object-cover grayscale brightness-50 group-hover:scale-105 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-1000"
                            />
                        </motion.div>
                        {/* Status Plate */}
                        <div className="absolute -bottom-6 -right-6 bg-[#C5A059] text-black px-10 py-10 rounded-3xl shadow-3xl rotate-3 group-hover:rotate-0 transition-transform">
                            <div className="flex flex-col items-center">
                                <Star className="mb-4" size={32} />
                                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Agency Status</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* The Values Section */}
                <div className="relative p-12 md:p-32 rounded-[4rem] bg-[#121214] border border-white/5 overflow-hidden mb-60">
                    <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-[#C5A059]/3 rounded-full blur-[150px] -z-10" />
                    <h2 className="text-4xl md:text-7xl font-bold mb-24 text-center font-heading tracking-tight underline underline-offset-8 decoration-[#C5A059]/30">Our Values</h2>
                    <div className="grid md:grid-cols-4 gap-16">
                        <ProcessStep number="01" title="Transparency" desc="Clear communication and honest feedback at every step." />
                        <ProcessStep number="02" title="Innovation" desc="Constantly exploring new technologies and design trends." />
                        <ProcessStep number="03" title="Dedication" desc="Going above and beyond to ensure project success." />
                        <ProcessStep number="04" title="Precision" desc="Meticulous attention to detail in design and code." />
                    </div>
                </div>

                {/* Engagement CTA */}
                <div className="text-center">
                    <h3 className="text-4xl md:text-7xl font-bold mb-16 tracking-tight font-heading">Let's Create <span className="font-display italic font-light text-[#C5A059]">Together.</span></h3>
                    <a href="/contact" className="btn-lux px-16 h-20 text-md">Start a Project</a>
                </div>
            </div>
        </section>
    );
};

const ProcessStep = ({ number, title, desc }: any) => (
    <div className="text-center relative group">
        <div className="text-9xl font-bold text-white/[0.02] mb-6 absolute -top-16 left-1/2 -translate-x-1/2 group-hover:text-[#C5A059]/5 transition-colors font-heading select-none">
            {number}
        </div>
        <h3 className="text-2xl font-bold mb-4 relative z-10 text-white font-heading tracking-tight">{title}</h3>
        <p className="text-zinc-500 text-sm relative z-10 font-medium leading-relaxed tracking-tight">{desc}</p>
    </div>
);

export default About;
