import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
    ArrowRight,
    Crown,
    Zap,
    Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';

import Testimonials from '../components/Testimonials';
import SEO from '../components/SEO';

const BrandTicker = () => {
    const brands = ['ROLEX', 'PORSCHE', 'LAMBORGHINI', 'GUCCI', 'PRADA', 'HERMES', 'TESLA', 'APPLE'];
    return (
        <div className="py-16 border-y border-white/5 bg-black/40 overflow-hidden select-none">
            <div className="flex whitespace-nowrap animate-infinite-scroll">
                {[...brands, ...brands].map((brand, i) => (
                    <span key={i} className="mx-16 text-xs font-black text-white/5 hover:text-[#C5A059]/40 transition-all tracking-[0.5em]">
                        {brand}
                    </span>
                ))}
            </div>
        </div>
    );
};

const Home = () => {
    const heroRef = useRef(null);
    const { scrollY } = useScroll();

    const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);
    const heroScale = useTransform(scrollY, [0, 600], [1, 0.95]);
    const heroRotate = useTransform(scrollY, [0, 600], [0, 2]);

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({
                x: (e.clientX / window.innerWidth - 0.5) * 40,
                y: (e.clientY / window.innerHeight - 0.5) * 40
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);



    return (
        <div className="bg-[#0A0A0B] text-white">
            <SEO
                title="Klypso | The Elite Digital Standard"
                description="Klypso is an ultra-premium digital agency crafting bespoke ecosystems for brands that demand absolute superiority."
                schema={{
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "name": "Klypso",
                    "url": "https://klypso.agency",
                    "potentialAction": {
                        "@type": "SearchAction",
                        "target": "https://klypso.agency/search?q={search_term_string}",
                        "query-input": "required name=search_term_string"
                    }
                }}
            />

            {/* Noise Overlay */}
            <div className="noise" />

            {/* Hero Section - The Grand Entrance */}
            <section ref={heroRef} className="min-h-screen relative flex flex-col items-center justify-center p-8 pt-32 overflow-hidden">
                {/* Background Atmosphere */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[60rem] h-[60rem] bg-[#C5A059]/5 rounded-full blur-[180px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-[#7C3AED]/5 rounded-full blur-[180px]" />

                    <motion.div
                        animate={{ x: mousePos.x, y: mousePos.y }}
                        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(197,160,89,0.03),transparent_70%)]"
                    />
                </div>

                <motion.div
                    style={{ opacity: heroOpacity, scale: heroScale, rotateX: heroRotate }}
                    className="relative z-10 text-center max-w-6xl perspective-1000"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="flex items-center justify-center gap-4 mb-10">
                            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#C5A059]/40" />
                            <span className="text-[10px] font-black tracking-[0.5em] text-[#C5A059] uppercase">
                                Crafting Private Digital Legacies
                            </span>
                            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#C5A059]/40" />
                        </div>

                        <h1 className="text-5xl sm:text-7xl md:text-[11rem] font-bold mb-12 tracking-[-0.04em] leading-[0.8] font-heading">
                            REFINED <br />
                            <span className="font-display italic font-light text-[#C5A059]">Engineering.</span>
                        </h1>

                        <p className="max-w-3xl mx-auto text-xl md:text-2xl text-zinc-400 font-medium leading-relaxed mb-16 tracking-tight">
                            We build high-performance <span className="text-white">digital systems</span> and <span className="text-white">luxury brand identities</span> for those who refuse to blend in.
                            Bespoke web architecture meets architectural beauty.
                        </p>
                    </motion.div>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                        <Link to="/contact" className="btn-lux group px-12 h-16 text-black">
                            Start a Conversation <div className="ml-4 w-6 h-6 rounded-full bg-black flex items-center justify-center -rotate-45 group-hover:rotate-0 transition-transform"><ArrowRight size={14} className="text-[#C5A059]" /></div>
                        </Link>
                        <Link to="/portfolio" className="btn-lux-outline px-12 h-16 border-white/5 hover:bg-white/5 transition-all">
                            View Our Work
                        </Link>
                    </div>
                </motion.div>

                {/* Floating Credits */}
                <div className="absolute bottom-20 left-8 md:left-20 flex flex-col gap-6 opacity-40">
                    <div className="h-20 w-[1px] bg-gradient-to-b from-[#C5A059] to-transparent" />
                    <p className="vertical-text text-[9px] font-black uppercase tracking-[0.4em] text-[#C5A059]">Agency • Bengaluru</p>
                </div>

                {/* Scroll Indicator */}
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-40"
                >
                    <span className="text-[8px] font-black uppercase tracking-[0.5em]">Scroll</span>
                    <div className="w-[1px] h-10 bg-gradient-to-b from-[#C5A059] to-transparent" />
                </motion.div>
            </section>

            <BrandTicker />

            {/* Core Capabilities */}
            <section className="py-40 px-4 bg-black relative">
                <div className="container mx-auto max-w-7xl">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-32">
                        <div className="max-w-xl">
                            <p className="text-[#C5A059] font-black tracking-[0.3em] uppercase text-[10px] mb-6">Our Services</p>
                            <h2 className="text-5xl md:text-8xl font-bold tracking-tighter leading-[0.9] font-heading">Digital <br /><span className="text-zinc-700 italic font-display font-medium">Excellence.</span></h2>
                        </div>
                        <p className="text-zinc-500 max-w-xs text-sm font-medium mt-8 md:mt-0 leading-loose border-l border-[#C5A059]/20 pl-8">
                            We operate at the intersection of sophisticated design and robust engineering. No shortcuts, just pure performance.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-24">
                        <FeatureCard
                            icon={<Crown className="w-10 h-10" />}
                            title="Bespoke Systems"
                            desc="High-performance web applications built on the MERN stack, optimized for scalability and speed."
                            delay={0}
                        />
                        <FeatureCard
                            icon={<Zap className="w-10 h-10" />}
                            title="Luxury UX/UI"
                            desc="Digital experiences that feel fluid. We focus on micro-interactions and high-end visual aesthetics."
                            delay={0.1}
                        />
                        <FeatureCard
                            icon={<Globe className="w-10 h-10" />}
                            title="Strategic Growth"
                            desc="Premium SEO and market positioning strategies designed to dominate competitive luxury sectors."
                            delay={0.2}
                        />
                    </div>
                </div>
            </section>

            {/* Case Study Feature */}
            <section className="py-40 px-4 bg-[#080809]">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-32 items-center mb-40">
                        <div className="space-y-12">
                            <div>
                                <h3 className="text-[#C5A059] font-black tracking-[0.4em] uppercase text-[10px] mb-8">Selected Case Study</h3>
                                <h2 className="text-5xl md:text-8xl font-bold tracking-tighter leading-none font-heading mb-10">Modern <br /><span className="italic font-display font-medium">Ecosystems.</span></h2>
                                <p className="text-zinc-400 text-lg font-medium leading-relaxed max-w-lg mb-12">
                                    We redesigned the digital presence for high-growth ventures, increasing engagement through intentional design and technical superiority.
                                </p>
                                <Link to="/portfolio" className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-white hover:text-[#C5A059] transition-colors group">
                                    View Full Case Study <div className="p-2 rounded-full border border-white/10 group-hover:border-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-black transition-all"><ArrowRight size={14} /></div>
                                </Link>
                            </div>
                        </div>
                        <div className="relative group p-4 border border-white/5 rounded-[4rem]">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                className="aspect-[4/5] rounded-[3rem] overflow-hidden relative bg-[#121214]"
                            >
                                <img
                                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000"
                                    className="w-full h-full object-cover grayscale brightness-75 group-hover:scale-105 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-1000 ease-out"
                                    alt="Luxury Brand Website Design"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                            </motion.div>
                            {/* Accent Piece */}
                            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#C5A059] rounded-3xl flex flex-col items-center justify-center rotate-6 group-hover:rotate-0 transition-all duration-500 shadow-2xl">
                                <span className="text-black font-black text-3xl font-heading">40%</span>
                                <span className="text-black font-black text-[8px] uppercase tracking-widest">Growth</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Performance Stats */}
            <section className="py-32 bg-black border-y border-white/5">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-20">
                        <EliteStat value="99.9" label="Uptime Reliability" unit="%" />
                        <EliteStat value="25" label="Industry Experts" unit="+" />
                        <EliteStat value="2" label="Development Speed" unit="wk" />
                        <EliteStat value="100" label="Client Satisfaction" unit="%" />
                    </div>
                </div>
            </section>

            {/* Klypso Nexus - Enterprise Ecosystem */}
            <section className="py-40 bg-[#0A0A0B] relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#C5A059]/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="container mx-auto max-w-7xl px-4 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div className="order-2 lg:order-1 relative">
                            <div className="p-4 border border-white/5 rounded-[4rem] bg-black/40 backdrop-blur-xl shadow-3xl">
                                <div className="aspect-[16/10] rounded-[3rem] overflow-hidden bg-zinc-900 flex items-center justify-center p-8 border border-white/5">
                                    <div className="w-full h-full border border-white/5 rounded-2xl bg-black/40 p-10 flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <div className="w-12 h-12 bg-[#C5A059] rounded-xl flex items-center justify-center font-black text-black text-2xl shadow-lg">K</div>
                                            <div className="flex gap-2">
                                                <div className="w-8 h-2 bg-[#C5A059]/40 rounded-full" />
                                                <div className="w-4 h-2 bg-white/10 rounded-full" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="w-full h-4 bg-white/5 rounded-full" />
                                            <div className="w-2/3 h-4 bg-white/5 rounded-full" />
                                            <div className="w-1/2 h-4 bg-[#C5A059]/10 rounded-full" />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="aspect-square bg-white/5 rounded-2xl" />
                                            <div className="aspect-square bg-[#C5A059]/20 rounded-2xl" />
                                            <div className="aspect-square bg-white/5 rounded-2xl" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Floating Badge */}
                            <div className="absolute -top-10 -right-10 w-44 h-44 border border-white/5 bg-black/80 backdrop-blur-3xl rounded-full flex flex-col items-center justify-center p-8 text-center rotate-12 group-hover:rotate-0 transition-transform duration-700 shadow-3xl">
                                <span className="text-[#C5A059] text-xs font-black uppercase tracking-tighter mb-2">Proprietary</span>
                                <span className="text-white text-xl font-bold font-heading leading-tight uppercase">Nexus <br /> Platform</span>
                            </div>
                        </div>

                        <div className="order-1 lg:order-2 space-y-12">
                            <div>
                                <p className="text-[#C5A059] font-black tracking-[0.4em] uppercase text-[10px] mb-8">Infrastructure</p>
                                <h2 className="text-5xl md:text-8xl font-bold tracking-tighter leading-[0.9] font-heading mb-10">
                                    Enterprise <br />
                                    <span className="italic font-display font-medium text-zinc-600">Operations.</span>
                                </h2>
                                <p className="text-zinc-400 text-lg font-medium leading-relaxed mb-12">
                                    Elite brands require more than just a website. We deploy **Klypso Nexus**,
                                    a proprietary enterprise engine that centralizes your global operations,
                                    finances, and client intelligence into one high-integrity ecosystem.
                                </p>
                                <div className="space-y-6 mb-12">
                                    <div className="flex items-center gap-6">
                                        <div className="w-2 h-2 rounded-full bg-[#C5A059]" />
                                        <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Advanced Financial Control</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="w-2 h-2 rounded-full bg-[#C5A059]" />
                                        <span className="text-sm font-black uppercase tracking-[0.2em] text-white">AI-Powered Predictive Analytics</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="w-2 h-2 rounded-full bg-[#C5A059]" />
                                        <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Secured Client Portal</span>
                                    </div>
                                </div>
                                <a
                                    href="https://klypso-nexus.onrender.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-lux px-12 h-16 inline-flex"
                                >
                                    Explore the Nexus Portal
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Testimonials />

            {/* Final CTA - The Masterpiece Exit */}
            <section className="py-60 px-4 relative overflow-hidden text-center bg-black">
                {/* Gold Ray */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-40 bg-gradient-to-b from-[#C5A059] to-transparent" />

                <div className="container mx-auto max-w-5xl relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-5xl sm:text-7xl md:text-[10rem] font-bold mb-16 tracking-tighter leading-[0.85] font-heading">
                            Forge Your <br />
                            <span className="font-display italic font-light text-[#C5A059]">Legacy.</span>
                        </h2>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-10">
                            <Link to="/contact" className="btn-lux px-16 h-20 text-md">
                                Start Your Project
                            </Link>
                            <p className="text-zinc-500 uppercase text-[9px] font-black tracking-[0.5em] max-w-xs text-left leading-relaxed">
                                We partner with a limited number of clients to ensure <br /> <span className="text-[#C5A059]">unrivaled attention to detail.</span>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc, delay }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.8 }}
    >
        <Link to="/services" className="group relative p-10 rounded-[2rem] border border-transparent hover:border-white/5 hover:bg-white/[0.01] transition-all duration-500 block">
            <div className="mb-10 text-[#C5A059] group-hover:scale-110 transition-transform duration-500 bg-[#C5A059]/5 w-20 h-20 rounded-2xl flex items-center justify-center">
                {icon}
            </div>
            <h3 className="text-2xl font-bold mb-6 tracking-tight text-white font-heading">
                {title}
            </h3>
            <p className="text-zinc-500 leading-relaxed font-medium">
                {desc}
            </p>
            <div className="mt-8 h-[1px] w-0 bg-[#C5A059] group-hover:w-full transition-all duration-700" />
        </Link>
    </motion.div>
);

const EliteStat = ({ value, label, unit }: any) => (
    <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="text-center md:text-left"
    >
        <h4 className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tighter font-heading">
            {value}<span className="text-lg font-light text-[#C5A059] ml-1">{unit}</span>
        </h4>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">
            {label}
        </p>
    </motion.div>
);

export default Home;
