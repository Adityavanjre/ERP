import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../api/config';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

interface JobPost {
    _id: string;
    role: string;
    type: string;
    location: string;
    description: string;
}

const Careers = () => {
    const [jobs, setJobs] = useState<JobPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/jobs`);
                setJobs(data || []);
            } catch (err) {
                console.error("Error fetching jobs:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, []);

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white pt-48 pb-32 px-4 relative overflow-hidden">
            <SEO
                title="Join The Collective | Klypso Elite Careers"
                description="We are scouting for extraordinary talent to join our private digital engineering collective."
            />

            {/* Noise Overlay */}
            <div className="noise" />

            {/* Atmosphere */}
            <div className="absolute top-[-10%] right-[-10%] w-[60rem] h-[60rem] bg-[#C5A059]/5 rounded-full blur-[200px]" />

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
                            Open Positions
                        </span>
                        <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                    </div>
                    <h1 className="text-6xl md:text-[9rem] font-bold mb-12 tracking-tight leading-[0.8] font-heading">
                        Join the <br />
                        <span className="font-display italic font-light text-[#C5A059]">Collective.</span>
                    </h1>
                    <p className="max-w-3xl mx-auto text-xl md:text-2xl text-zinc-500 font-medium leading-relaxed tracking-tight underline underline-offset-4 decoration-[#C5A059]/20">
                        We are a specialized agency of designers and engineers. We value <span className="text-white">craftsmanship, autonomy, and continuous growth.</span>
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-40">
                    <BenefitCard
                        title="Remote-First"
                        desc="Work from anywhere. We prioritize results and clear communication over office presence."
                    />
                    <BenefitCard
                        title="Competitive Pay"
                        desc="We invest in the best. Our compensation packages reflect the high value we place on talent."
                    />
                    <BenefitCard
                        title="Growth Stipend"
                        desc="Annual budget for books, courses, and conferences to help you master your craft."
                    />
                    <BenefitCard
                        title="Modern Stack"
                        desc="We build with the latest tools and maintain high standards for code quality and design."
                    />
                </div>

                <div className="bg-[#121214] border border-white/5 rounded-[3rem] p-12 md:p-20 mb-40 shadow-3xl">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-white/5 pb-12">
                        <h2 className="text-4xl font-bold font-heading tracking-tight flex items-center gap-6">
                            <Briefcase className="text-[#C5A059]" size={32} /> Active Engagements
                        </h2>
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-6 md:mt-0">Uptime: 99.9% Scout Status</span>
                    </div>

                    <div className="space-y-6">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="h-32 bg-white/[0.02] animate-pulse rounded-2xl" />
                            ))
                        ) : jobs.length > 0 ? (
                            jobs.map(job => (
                                <JobCard
                                    key={job._id}
                                    role={job.role}
                                    type={job.type}
                                    location={job.location}
                                />
                            ))
                        ) : (
                            <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                                <p className="text-zinc-600 font-medium italic">No active openings. Standby for future transmissions.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center relative p-16 md:p-32 rounded-[4rem] bg-gradient-to-br from-[#121214] to-black border border-white/5 overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#C5A059]/5 rounded-full blur-[100px] -z-10" />
                    <h3 className="text-5xl md:text-8xl font-bold mb-10 tracking-tight font-heading leading-none">General <br /><span className="font-display italic font-light text-[#C5A059]">Application.</span></h3>
                    <p className="text-zinc-400 text-lg md:text-xl mb-16 max-w-2xl mx-auto leading-relaxed">
                        Don't see a role that fits? if you are a master of your craft, we'd still love to hear from you.
                    </p>
                    <Link to="/apply" className="btn-lux px-16 h-20 text-md">
                        Get in Touch
                    </Link>
                </div>
            </div>
        </div>
    );
};

const BenefitCard = ({ title, desc }: { title: string, desc: string }) => (
    <div className="premium-card p-10 space-y-6">
        <h3 className="font-bold text-lg text-white flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center">
                <CheckCircle size={18} className="text-[#C5A059]" />
            </div>
            {title}
        </h3>
        <p className="text-zinc-500 text-sm leading-relaxed font-medium">{desc}</p>
    </div>
);

const JobCard = ({ role, type, location }: { role: string, type: string, location: string }) => (
    <div className="group flex flex-col md:flex-row md:items-center justify-between p-10 bg-black/40 rounded-3xl border border-white/5 hover:border-[#C5A059]/30 transition-all duration-700 cursor-pointer shadow-2xl">
        <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white group-hover:text-[#C5A059] transition-colors font-heading">{role}</h3>
            <div className="flex gap-8 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                <span className="flex items-center gap-2"><Clock size={12} className="text-[#C5A059]" /> {type}</span>
                <span className="flex items-center gap-2"><MapPin size={12} className="text-[#C5A059]" /> {location}</span>
            </div>
        </div>
        <div className="mt-8 md:mt-0">
            <Link to="/apply" className="btn-lux px-8 h-12 text-[10px]">Send Application</Link>
        </div>
    </div>
);

export default Careers;
