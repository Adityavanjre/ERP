import { motion } from 'framer-motion';
import {
    Smartphone, TrendingUp, PenTool,
    Code, Shield, Monitor,
    Camera, Zap, Search,
    Layers, ArrowRight,
    Crown
} from 'lucide-react';
import SEO from '../components/SEO';

const Services = () => {
    return (
        <section className="min-h-screen bg-[#0A0A0B] text-white pt-48 pb-32 px-4 relative overflow-hidden">
            {/* Noise Overlay */}
            <div className="noise" />

            {/* Atmosphere */}
            <div className="absolute top-[-10%] left-[-10%] w-[60rem] h-[60rem] bg-[#C5A059]/5 rounded-full blur-[200px]" />
            <div className="absolute top-[30%] right-[-10%] w-[40rem] h-[40rem] bg-[#7C3AED]/3 rounded-full blur-[200px]" />

            <SEO
                title="Elite Capabilities | Klypso Digital Architecture"
                description="High-end digital engineering and strategy for elite brands."
            />

            <div className="container mx-auto max-w-7xl relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center mb-48"
                >
                    <div className="flex items-center justify-center gap-4 mb-10">
                        <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                        <span className="text-[10px] font-black tracking-[0.5em] text-[#C5A059] uppercase">
                            What We Do
                        </span>
                        <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                    </div>
                    <h1 className="text-6xl md:text-[10rem] font-bold mb-12 tracking-tight leading-[0.8] font-heading">
                        Tailored <br />
                        <span className="font-display italic font-light text-[#C5A059]">Solutions.</span>
                    </h1>
                    <p className="max-w-3xl mx-auto text-xl md:text-2xl text-zinc-500 font-medium leading-relaxed tracking-tight underline-offset-8">
                        We specialize in <span className="text-white">high-end digital engineering</span> and <span className="text-white">strategic design</span>. From bespoke web systems to visual storytelling, we build the foundations for your brand's digital growth.
                    </p>
                </motion.div>

                {/* The Capabilities Ledger */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-24 mb-60">
                    <ServiceDetailCard
                        icon={<Code size={32} />}
                        title="Web Development"
                        description="Robust, scalable web applications built with the MERN stack (MongoDB, Express, React, Node.js). We prioritize pixel-perfect precision and high-performance code."
                        features={['Full-Stack MERN Development', 'React & Next.js Ecosystems', 'Custom API Integration', 'Scalable Cloud Hosting']}
                    />
                    <ServiceDetailCard
                        icon={<Smartphone size={32} />}
                        title="Mobile Experiences"
                        description="Seamless mobile applications that feel native. We focus on fluid animations, intuitive UI, and cross-platform reliability for both iOS and Android."
                        features={['React Native Development', 'Intuitive UI/UX Design', 'Performance Optimization', 'App Store Deployment']}
                    />
                    <ServiceDetailCard
                        icon={<TrendingUp size={32} />}
                        title="Search Strategy"
                        description="Data-driven SEO strategies that go beyond keywords. We optimize your technical architecture and content to ensure you rank where it matters."
                        features={['Technical SEO Audits', 'Keyword Intelligence', 'Content Authority', 'Growth Analytics']}
                    />
                    <ServiceDetailCard
                        icon={<PenTool size={32} />}
                        title="Brand Identity"
                        description="Visual storytelling that resonates with your audience. We craft unique brand identities, logos, and design systems that stand the test of time."
                        features={['Corporate Identity Design', 'UX/UI Architecture', 'Visual Design Systems', 'Creative Direction']}
                    />
                    <ServiceDetailCard
                        icon={<Monitor size={32} />}
                        title="Cloud Systems"
                        description="Secure and resilient cloud infrastructure designed for modern business needs. We ensure your systems are always online and highly protected."
                        features={['AWS & Azure Solutions', 'Serverless Architecture', 'Database Management', 'Cyber Security Audits']}
                    />
                    <ServiceDetailCard
                        icon={<Camera size={32} />}
                        title="Photography"
                        description="Professional visual content that captures the essence of your brand. From corporate portraits to architectural and product photography."
                        features={['Commercial Photography', 'Architectural Stills', 'Product Videography', 'Visual Storytelling']}
                    />
                </div>

                {/* The Process */}
                <div className="mb-60">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-32 border-b border-white/5 pb-16">
                        <h2 className="text-4xl md:text-8xl font-bold tracking-tighter leading-none font-heading">Our <br /><span className="font-display italic font-light text-[#C5A059]">Process.</span></h2>
                        <p className="text-zinc-600 max-w-xs text-xs font-black uppercase tracking-[0.3em] mt-10 md:mt-0">The Road to Success</p>
                    </div>

                    <div className="space-y-4">
                        <ProcessRow
                            number="01"
                            title="Discovery & Strategy"
                            desc="We begin by understanding your business goals and market landscape. This phase defines the roadmap for everything we build together."
                            icon={<Search size={20} />}
                        />
                        <ProcessRow
                            number="02"
                            title="Design & Experience"
                            desc="We draft high-fidelity prototypes and design systems that prioritize user experience and brand alignment."
                            icon={<Layers size={20} />}
                        />
                        <ProcessRow
                            number="03"
                            title="Engineering & Build"
                            desc="Our developers bring the vision to life using clean, scalable code. We follow agile methodologies to ensure transparent progress."
                            icon={<Zap size={20} />}
                        />
                        <ProcessRow
                            number="04"
                            title="Testing & Launch"
                            desc="Rigorous quality assurance and performance testing ensure a flawless launch. We support you through deployment and beyond."
                            icon={<Shield size={20} />}
                        />
                    </div>
                </div>

                {/* Masterpiece CTA */}
                <div className="relative p-12 md:p-32 rounded-[4rem] bg-[#121214] border border-white/5 overflow-hidden text-center flex flex-col items-center">
                    <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-[#C5A059]/3 rounded-full blur-[120px] -z-10" />

                    <Crown size={64} className="text-[#C5A059] mb-12 opacity-40" />
                    <h2 className="text-5xl md:text-8xl font-bold mb-12 tracking-tight font-heading leading-none">Ready to <br /><span className="font-display italic font-light text-[#C5A059]">Start?</span></h2>
                    <p className="text-zinc-400 text-lg md:text-xl font-medium max-w-2xl mb-16 leading-relaxed">
                        Join an ambitious list of clients who refuse to compromise on quality and innovation. Let's build something exceptional.
                    </p>
                    <a href="/contact" className="btn-lux px-16 h-20 text-md">
                        Get in Touch
                    </a>
                </div>
            </div>
        </section>
    );
};

const ServiceDetailCard = ({ icon, title, description, features }: any) => (
    <motion.div
        whileHover={{ y: -10 }}
        className="group relative flex flex-col h-full"
    >
        <div className="w-20 h-20 rounded-3xl bg-white/[0.01] border border-white/5 flex items-center justify-center mb-12 group-hover:bg-[#C5A059]/10 group-hover:border-[#C5A059]/30 transition-all duration-700 shadow-xl group-hover:rotate-6">
            <div className="text-[#C5A059] group-hover:scale-110 transition-transform duration-700">{icon}</div>
        </div>
        <h3 className="text-3xl font-bold mb-6 tracking-tight text-white font-heading">{title}</h3>
        <p className="text-zinc-500 mb-10 leading-relaxed font-medium flex-grow">
            {description}
        </p>
        <ul className="space-y-6 border-t border-white/5 pt-10">
            {features.map((feature: string, idx: number) => (
                <li key={idx} className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059] mr-4 shadow-[0_0_10px_#C5A059]" />
                    {feature}
                </li>
            ))}
        </ul>
    </motion.div>
);

const ProcessRow = ({ number, title, desc, icon }: any) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        className="group flex flex-col md:flex-row items-center gap-12 p-12 rounded-[3rem] border border-transparent hover:border-white/5 hover:bg-white/[0.01] transition-all duration-700"
    >
        <div className="text-7xl font-bold text-zinc-900 group-hover:text-[#C5A059]/10 transition-colors font-heading">
            {number}
        </div>
        <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-500 group-hover:text-[#C5A059] transition-all mx-auto md:mx-0">
                    {icon}
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight font-heading">{title}</h3>
            </div>
            <p className="text-zinc-500 text-lg font-medium leading-relaxed max-w-4xl">{desc}</p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="text-[#C5A059]" size={32} />
        </div>
    </motion.div>
);

export default Services;
