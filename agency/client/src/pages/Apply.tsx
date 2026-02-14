import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, ArrowLeft, Paperclip } from 'lucide-react';
import { Link } from 'react-router-dom';
import API_URL from '../api/config';
import SEO from '../components/SEO';

const Apply = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'General Application',
        portfolio: '',
        resume: '',
        message: '',
    });

    const [status, setStatus] = useState<null | 'success' | 'error'>(null);
    const [loading, setLoading] = useState(false);

    const roles = [
        'Select a Role',
        'Frontend Engineer',
        'Backend Architect',
        'UI/UX Designer',
        'Brand Strategist',
        'Technical Writer',
        'General Application'
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        // Simulate API call for now (or use the same enquiry endpoint with a 'type' field if backend supports it)
        try {
            const res = await fetch(`${API_URL}/api/enquiries`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    service: 'Join the Collective', // Identifier for backend
                    message: `[ROLE: ${formData.role}] [PORTFOLIO: ${formData.portfolio}] \n\n ${formData.message}`
                })
            });

            if (!res.ok) throw new Error('Failed to send application');

            setStatus('success');
            setFormData({ name: '', email: '', role: 'General Application', portfolio: '', resume: '', message: '' });
        } catch (error) {
            console.error(error);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="min-h-screen bg-[#0A0A0B] text-white pt-48 pb-32 px-4 relative overflow-hidden">
            <SEO
                title="Initiate Application | Klypso Collective"
                description="Apply to join our specialized agency of designers and engineers."
            />

            <div className="noise" />

            <div className="absolute top-[-10%] left-[-10%] w-[60rem] h-[60rem] bg-[#C5A059]/5 rounded-full blur-[200px]" />

            <div className="container mx-auto max-w-4xl relative z-10">
                <Link to="/careers" className="inline-flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 hover:text-[#C5A059] transition-colors mb-16">
                    <ArrowLeft size={14} /> Back to Open Positions
                </Link>

                <div className="text-center mb-24">
                    <div className="flex items-center justify-center gap-4 mb-10">
                        <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                        <span className="text-[10px] font-black tracking-[0.5em] text-[#C5A059] uppercase">
                            Career Application
                        </span>
                        <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                    </div>
                    <h1 className="text-6xl md:text-[7rem] font-bold mb-8 tracking-tight leading-[0.85] font-heading">
                        Join the <br />
                        <span className="font-display italic font-light text-[#C5A059]">Collective.</span>
                    </h1>
                    <p className="max-w-xl mx-auto text-xl text-zinc-500 font-medium">
                        Extraordinary talent is always welcome. Tell us about your craft and share your best work.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#121214] border border-white/5 p-10 md:p-20 rounded-[3rem] shadow-3xl relative overflow-hidden"
                >
                    <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                        <div className="grid md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-[#C5A059]/40 transition-all font-medium"
                                    placeholder="Enter your name"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-[#C5A059]/40 transition-all font-medium"
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1">Target Role</label>
                                <div className="relative">
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-[#C5A059]/40 transition-all appearance-none cursor-pointer font-medium"
                                    >
                                        {roles.map((r) => (
                                            <option key={r} value={r} className="bg-[#0A0A0B] text-white">{r}</option>
                                        ))}
                                    </select>
                                    <Paperclip size={14} className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1">Portfolio Link</label>
                                <input
                                    type="url"
                                    name="portfolio"
                                    value={formData.portfolio}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-[#C5A059]/40 transition-all font-medium"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1">Resume / CV Link</label>
                            <input
                                type="url"
                                name="resume"
                                value={formData.resume || ''}
                                onChange={handleChange}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-[#C5A059]/40 transition-all font-medium"
                                placeholder="Google Drive / Dropbox / LinkedIn PDF link"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1">Tell us about your craft</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                rows={6}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-[#C5A059]/40 transition-all resize-none font-medium"
                                placeholder="What makes your work exceptional?..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#C5A059] text-black py-7 rounded-2xl font-black flex items-center justify-center gap-4 hover:bg-[#D4AF37] transition-all duration-500 shadow-2xl shadow-[#C5A059]/20 disabled:opacity-50 group text-xs uppercase tracking-[0.3em]"
                        >
                            {loading ? 'Submitting...' : 'Submit application'}
                            <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-all">
                                <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </div>
                        </button>

                        <AnimatePresence>
                            {status === 'success' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex items-center gap-6 text-emerald-500"
                                >
                                    <CheckCircle size={28} className="shrink-0" />
                                    <p className="text-xs font-bold uppercase tracking-widest leading-loose">Application Received. We will review your portfolio carefully.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </motion.div>
            </div>
        </section>
    );
};

export default Apply;
