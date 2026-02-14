import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../api/config';
import {
    Send, CheckCircle, Mail,
    Phone, Instagram,
    Twitter, Linkedin, ArrowRight
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const services = [
    'Web Development',
    'Mobile Experiences',
    'Search Strategy (SEO)',
    'Photography',
    'Brand Identity',
    'Cloud Systems',
    'Consulting',
    'Join the Collective',
];

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        service: services[0],
        message: '',
    });

    const [status, setStatus] = useState<null | 'success' | 'error'>(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        let value = e.target.value;

        if (e.target.name === 'phone') {
            value = value.replace(/[^0-9+]/g, '').slice(0, 15);
        }

        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const res = await fetch(`${API_URL}/api/enquiries`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to send enquiry');

            setStatus('success');
            setFormData({ name: '', email: '', phone: '', service: services[0], message: '' });
        } catch (error) {
            console.error(error);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="min-h-screen bg-[#0A0A0B] text-white pt-48 pb-32 px-4 relative overflow-hidden">
            <Helmet>
                <title>Contact Us | Klypso Agency</title>
                <meta name="description" content="Get in touch with Klypso for high-end digital engineering and strategic design." />
            </Helmet>

            {/* Noise Overlay */}
            <div className="noise" />

            {/* Premium Atmosphere */}
            <div className="absolute top-[-10%] right-[-10%] w-[60rem] h-[60rem] bg-[#C5A059]/5 rounded-full blur-[180px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-[#7C3AED]/5 rounded-full blur-[180px]" />

            <div className="container mx-auto max-w-7xl relative z-10">
                <div className="grid lg:grid-cols-2 gap-20 lg:gap-32 items-start">

                    {/* Left: Context */}
                    <div className="space-y-20">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1 }}
                        >
                            <div className="flex items-center gap-4 mb-10">
                                <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                                <span className="text-[10px] font-black tracking-[0.5em] text-[#C5A059] uppercase">
                                    Contact Us
                                </span>
                            </div>
                            <h1 className="text-5xl sm:text-7xl md:text-[8rem] font-bold mb-10 tracking-tight leading-[0.85] font-heading">
                                Start Your <br />
                                <span className="font-display italic font-light text-[#C5A059]">Project.</span>
                            </h1>
                            <p className="max-w-md text-xl text-zinc-500 font-medium leading-relaxed">
                                We're here to help you build something exceptional. Tell us about your vision and let's make it a reality.
                            </p>
                        </motion.div>

                        <div className="space-y-12 pt-12 border-t border-white/5">
                            <ContactLink
                                icon={<Mail size={24} />}
                                label="Email Us"
                                value="klypsoproduct@gmail.com"
                                href="mailto:klypsoproduct@gmail.com"
                            />
                            <ContactLink
                                icon={<Phone size={24} />}
                                label="Call Us"
                                value="+91 9449734414"
                                href="tel:+919449734414"
                            />
                        </div>

                        <div className="flex gap-6">
                            <SocialLink icon={<Instagram size={20} />} />
                            <SocialLink icon={<Linkedin size={20} />} />
                            <SocialLink icon={<Twitter size={20} />} />
                        </div>
                    </div>

                    {/* Right: The Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1 }}
                        className="bg-[#121214] border border-white/5 p-6 sm:p-10 md:p-20 rounded-[3rem] shadow-3xl relative overflow-hidden"
                    >
                        {/* Decorative Gradient */}
                        <div className="absolute top-0 right-0 w-80 h-80 bg-[#C5A059]/5 blur-[120px] -z-10" />

                        <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1">Your Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-800 font-medium"
                                    placeholder="Enter your full name"
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-800 font-medium"
                                        placeholder="work@agency.com"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-800 font-medium"
                                        placeholder="+91..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1">Select Service</label>
                                <div className="relative">
                                    <select
                                        name="service"
                                        value={formData.service}
                                        onChange={handleChange}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-[#C5A059]/40 transition-all appearance-none cursor-pointer font-medium"
                                    >
                                        {services.map((svc) => (
                                            <option key={svc} value={svc} className="bg-[#0A0A0B] text-white">{svc}</option>
                                        ))}
                                    </select>
                                    <ArrowRight size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none rotate-90" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1">Your Message</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    rows={5}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-[#C5A059]/40 transition-all resize-none placeholder:text-zinc-800 font-medium"
                                    placeholder="Describe your vision..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#C5A059] text-black py-7 rounded-2xl font-black flex items-center justify-center gap-4 hover:bg-[#D4AF37] transition-all duration-500 shadow-2xl shadow-[#C5A059]/20 disabled:opacity-50 group text-xs uppercase tracking-[0.3em]"
                            >
                                {loading ? 'Transmitting...' : 'Transmit Protocol'}
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
                                        <p className="text-xs font-bold uppercase tracking-widest leading-loose">Message Sent Successfully. We'll get back to you shortly.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </motion.div>
                </div>
            </div>
        </section >
    );
};

const SocialLink = ({ icon }: { icon: React.ReactNode }) => (
    <div className="w-14 h-14 rounded-2xl border border-white/5 flex items-center justify-center text-zinc-600 hover:text-[#C5A059] hover:border-[#C5A059]/30 transition-all duration-500 group cursor-pointer bg-white/[0.01]">
        {icon}
    </div>
);

const ContactLink = ({ icon, label, value, href }: { icon: React.ReactNode, label: string, value: string, href?: string }) => (
    <div className="flex items-center gap-8 group">
        <div className="w-16 h-16 rounded-2xl border border-white/5 flex items-center justify-center text-zinc-700 group-hover:text-[#C5A059] group-hover:border-[#C5A059]/40 transition-all duration-700 shadow-xl bg-white/[0.01]">
            {icon}
        </div>
        <div>
            <h4 className="text-[9px] font-black uppercase tracking-[0.5em] text-zinc-600 mb-2">{label}</h4>
            <a href={href} className="text-2xl font-bold text-white group-hover:text-[#C5A059] transition-colors tracking-tight font-heading">{value}</a>
        </div>
    </div>
);

export default Contact;
