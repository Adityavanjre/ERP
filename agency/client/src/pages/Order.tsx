import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, CheckCircle, CreditCard,
    ChevronLeft, Link as LinkIcon,
    AlertCircle, ShieldCheck, Zap, Layers,
    Smartphone, Globe, Lock
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../api/config';
import SEO from '../components/SEO';

const services = [
    'Web Architecture',
    'Mobile Experience',
    'Organic Strategy (SEO)',
    'Visual Assets & Photo',
    'Intelligence Systems',
    'Professional Photography',
    'Brand Narrative',
    'Other Evolution',
];

const Order = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showQRCode, setShowQRCode] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        service: 'Web Architecture',
        projectType: 'New Project',
        budget: '₹50k - ₹2L',
        timeline: '1-2 months',
        message: '',
        referenceLinks: '',
    });

    const upiId = "adityavanjre280-4@okaxis";
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${upiId}&pn=Klypso&cu=INR`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        let value = e.target.value;

        // Basic phone validation check in-flow
        if (e.target.name === 'phone') {
            value = value.replace(/[^0-9+]/g, '').slice(0, 15);
        }

        setFormData({ ...formData, [e.target.name]: value });
    };

    const nextStep = () => {
        if (step === 1) {
            if (!formData.name || !formData.email || !formData.message) {
                setError('Primary identification and mission details are required.');
                return;
            }
            if (formData.phone && formData.phone.length < 10) {
                setError('Please provide a valid communication number.');
                return;
            }
        }
        setError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setStep(step + 1);
    };

    const prevStep = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setStep(step - 1);
    };

    const handleSubmitRequirements = async () => {
        setLoading(true);
        setError('');
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            const payload = {
                ...formData,
                referenceLinks: formData.referenceLinks.split(',').map(link => link.trim()).filter(link => link)
            };

            await axios.post(`${API_URL}/api/enquiries`, payload, config);
            setStep(3);
        } catch (err) {
            console.error(err);
            setError('Tactical transmission failed. Please retry.');
        } finally {
            setLoading(false);
        }
    };

    const [agreed, setAgreed] = useState(false);

    const renderStep1_Requirements = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
        >
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Identity</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-700"
                        placeholder="Full Name"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Electronic Mail</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-700"
                        placeholder="your@email.com"
                    />
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Phone Line</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-700"
                        placeholder="+91..."
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Core Expertise</label>
                    <select
                        name="service"
                        value={formData.service}
                        onChange={handleChange}
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-5 text-white focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                    >
                        {services.map(svc => (
                            <option key={svc} value={svc}>{svc}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Protocol Type</label>
                    <select
                        name="projectType"
                        value={formData.projectType}
                        onChange={handleChange}
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-5 text-white focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                    >
                        <option value="New Project">Greenfield Development</option>
                        <option value="Redesign">Legacy Refactoring</option>
                        <option value="Maintenance">Tactical Maintenance</option>
                        <option value="Consultation">Strategic Consultation</option>
                    </select>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Investment Range</label>
                    <select
                        name="budget"
                        value={formData.budget}
                        onChange={handleChange}
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-5 text-white focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                    >
                        <option value="< ₹50k">Basic Architecture (&lt; ₹50k)</option>
                        <option value="₹50k - ₹2L">Balanced Scaling (₹50k - ₹2L)</option>
                        <option value="₹2L - ₹5L">Enterprise Core (₹2L - ₹5L)</option>
                        <option value="> ₹5L">Ecosystem Infrastructure (&gt; ₹5L)</option>
                    </select>
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Timeline Velocity</label>
                <div className="flex gap-4 flex-wrap">
                    {['ASAP', '1-2 months', '3-6 months', 'Flexible'].map(opt => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => setFormData({ ...formData, timeline: opt })}
                            className={`px-8 py-3 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${formData.timeline === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/20 hover:text-white'}`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">The Mission Briefing</label>
                <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-3xl p-6 text-white focus:outline-none focus:border-indigo-500/50 transition-all resize-none placeholder:text-gray-700"
                    placeholder="Describe the digital future you envision..."
                ></textarea>
            </div>

            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Intelligence References (Optional)</label>
                <div className="flex items-center bg-white/[0.03] border border-white/5 rounded-2xl p-5 focus-within:border-indigo-500/50 transition-all">
                    <LinkIcon size={18} className="text-gray-600 mr-4" />
                    <input
                        type="text"
                        name="referenceLinks"
                        value={formData.referenceLinks}
                        onChange={handleChange}
                        className="w-full bg-transparent text-white focus:outline-none placeholder:text-gray-700"
                        placeholder="Inspiration URLs, separated by commas..."
                    />
                </div>
            </div>

            <div className="flex justify-end pt-8">
                <button
                    onClick={nextStep}
                    className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-indigo-500 hover:scale-105 transition-all duration-300 shadow-xl shadow-indigo-500/20 group"
                >
                    Review Protocol <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </motion.div>
    );

    const renderStep2_Review = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
        >
            <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -z-10" />

                <h3 className="text-2xl font-black mb-10 flex items-center gap-4 text-white">
                    <CheckCircle className="text-indigo-400" size={28} /> Confirm Synchronization
                </h3>

                <div className="grid md:grid-cols-2 gap-12 text-sm">
                    <ReviewField label="Designation" value={formData.name} />
                    <ReviewField label="Communication" value={formData.email} />
                    <ReviewField label="Target Service" value={formData.service} />
                    <ReviewField label="Protocol Type" value={formData.projectType} />
                    <ReviewField label="Investment" value={formData.budget} />
                    <ReviewField label="Velocity" value={formData.timeline} />
                </div>

                <div className="mt-12 pt-12 border-t border-white/5">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 block mb-4">Mission Briefing</label>
                    <p className="text-gray-300 italic text-lg font-light leading-relaxed">"{formData.message}"</p>
                </div>
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-8 flex gap-6 items-start">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-white mb-2 uppercase tracking-widest text-xs">Engagement Note</h4>
                    <p className="text-gray-400 text-sm font-light leading-relaxed">
                        Submitting these requirements initiates a 24-hour tactical review. If you choose to proceed with an advance, your project slot will be locked immediately.
                    </p>
                </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <label className="flex items-start gap-4 cursor-pointer group">
                    <div className="mt-1">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="w-5 h-5 rounded border-white/10 bg-black text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                        />
                    </div>
                    <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                        I acknowledge the <span className="text-indigo-400 underline">Engagement Protocols</span> and <span className="text-indigo-400 underline">Privacy Strategy</span>. Payments are secured and governed by our refund structure.
                    </span>
                </label>
            </div>

            <div className="flex flex-col md:flex-row justify-between gap-6 pt-4">
                <button
                    onClick={prevStep}
                    className="flex items-center justify-center gap-3 px-8 py-5 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-widest"
                >
                    <ChevronLeft size={16} /> Re-Edit Parameters
                </button>
                <button
                    onClick={handleSubmitRequirements}
                    disabled={loading || !agreed}
                    className={`bg-white text-black px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-indigo-500 hover:text-white transition-all duration-500 shadow-xl ${(loading || !agreed) ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105 shadow-white/5'}`}
                >
                    {loading ? 'Transmitting...' : 'Initiate Secure Payment'}
                    {!loading && <CreditCard size={18} />}
                </button>
            </div>
        </motion.div>
    );

    const renderStep3_Payment = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-12"
        >
            <div className="space-y-6">
                <div className="w-24 h-24 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(79,70,229,0.3)] border border-indigo-500/30">
                    <CheckCircle size={48} />
                </div>
                <h2 className="text-4xl md:text-6xl font-black italic font-serif">Mission Received.</h2>
                <p className="text-gray-400 text-xl font-light max-w-xl mx-auto">Your digital footprint has been established. Secure your slot in our development queue.</p>
            </div>

            <div className="max-w-md mx-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-zinc-950 rounded-[2.5rem] p-10 md:p-12 border border-white/10 shadow-2xl overflow-hidden">

                    <div className="mb-10 flex flex-col items-center">
                        <Lock size={20} className="text-indigo-500 mb-4" />
                        <h3 className="font-black text-xs uppercase tracking-[0.4em] text-gray-500">Secure Protocol</h3>
                    </div>

                    {showQRCode ? (
                        <div className="space-y-8">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white p-6 rounded-[2rem] shadow-inner"
                            >
                                <img
                                    src={qrCodeUrl}
                                    alt="UPI QR Code"
                                    className="w-56 h-56 mx-auto object-contain mix-blend-multiply"
                                />
                            </motion.div>
                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Universal Interface (UPI)</p>
                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl font-mono text-sm tracking-wider select-all cursor-pointer hover:bg-white/10 transition-colors">
                                    {upiId}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowQRCode(false)}
                                className="text-xs font-black uppercase tracking-[0.3em] text-gray-500 hover:text-indigo-400 transition-colors"
                            >
                                Return to Summary
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            <div className="p-10 bg-white/[0.03] border border-white/5 rounded-3xl">
                                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 mb-4">Advance Commitment</div>
                                <div className="text-6xl font-black text-white tracking-tighter tabular-nums mb-2">₹25K</div>
                                <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Deductible from project total</div>
                            </div>
                            <button
                                onClick={() => setShowQRCode(true)}
                                className="w-full bg-white text-black py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-500 hover:text-white transition-all duration-500 flex justify-center items-center gap-4 shadow-2xl"
                            >
                                Pay Securely <ArrowRight size={18} />
                            </button>
                            <div className="flex items-center justify-center gap-6 opacity-30">
                                <Smartphone size={16} />
                                <Globe size={16} />
                                <Lock size={16} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-center gap-4 text-gray-600">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Quantum-Grade Security</span>
                </div>
                <p className="text-xs font-light">Transmission summary sent to <span className="text-indigo-400">{formData.email}</span></p>
            </div>
        </motion.div>
    );

    return (
        <section className="min-h-screen bg-black text-white pt-32 pb-24 px-4 relative overflow-hidden">
            <SEO
                title="Secure Your Slot | Klypso Protocol"
                description="Initiate your project sequence. High-performance digital architecture starts with a single protocol."
            />

            {/* Mesh Background */}
            <div className="absolute top-0 right-0 w-[60rem] h-[60rem] bg-indigo-500/10 rounded-full blur-[160px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-purple-500/5 rounded-full blur-[140px] -z-10" />

            <div className="container mx-auto max-w-5xl relative z-10">

                {/* Visual Progress Steps */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-24 gap-8">
                    <div className="flex-1">
                        <div className="inline-block px-4 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 backdrop-blur-md mb-6">
                            <span className="text-[10px] font-black tracking-[0.2em] text-indigo-300 uppercase">Step {step} of 3</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic font-serif">
                            {step === 1 && "The Mission."}
                            {step === 2 && "The Review."}
                            {step === 3 && "The Lock."}
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black transition-all duration-500 ${step === s ? 'bg-indigo-600 text-white shadow-[0_0_30px_rgba(79,70,229,0.4)] border border-indigo-400' : step > s ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-gray-700 border border-white/5'}`}>
                                    {step > s ? <CheckCircle size={24} /> : s}
                                </div>
                                {s < 3 && <div className={`hidden md:block w-8 h-px transition-all duration-700 ${step > s ? 'bg-indigo-500' : 'bg-white/10'}`} />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-16">
                    <div className="lg:col-span-2">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl mb-10 flex items-center gap-4 text-sm font-bold"
                            >
                                <AlertCircle size={20} className="shrink-0" />
                                {error}
                            </motion.div>
                        )}

                        <div className="relative">
                            <AnimatePresence mode="wait">
                                {step === 1 && renderStep1_Requirements()}
                                {step === 2 && renderStep2_Review()}
                                {step === 3 && renderStep3_Payment()}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Sidebar Information */}
                    <div className="space-y-10">
                        <InfoCard
                            icon={<Zap className="text-indigo-400" />}
                            title="Rapid Onboarding"
                            desc="Once the advance is secured, our tactical team begins blueprinting within 12 hours."
                        />
                        <InfoCard
                            icon={<Layers className="text-purple-400" />}
                            title="Flexible Architecture"
                            desc="Not sure about every detail? No problem. Our systems are built to evolve with your project."
                        />
                        <InfoCard
                            icon={<ShieldCheck className="text-indigo-400" />}
                            title="Escrow Security"
                            desc="Commitments are held in a secure protocol until the discovery phase is finalized."
                        />

                        <div className="pt-10 border-t border-white/5">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-6 font-sans">Strategic Partners</h4>
                            <div className="grid grid-cols-2 gap-8 opacity-20 grayscale">
                                <div className="h-8 bg-white/20 rounded-lg animate-pulse" />
                                <div className="h-8 bg-white/20 rounded-lg animate-pulse" />
                                <div className="h-8 bg-white/20 rounded-lg animate-pulse" />
                                <div className="h-8 bg-white/20 rounded-lg animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const ReviewField = ({ label, value }: { label: string, value: string }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">{label}</label>
        <div className="text-lg font-bold text-white tracking-tight">{value || "Not specified"}</div>
    </div>
);

const InfoCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl backdrop-blur-sm hover:bg-white/[0.04] transition-all duration-500">
        <div className="mb-6 w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
            {icon}
        </div>
        <h4 className="text-lg font-black mb-2 tracking-tight">{title}</h4>
        <p className="text-gray-400 text-sm font-light leading-relaxed">{desc}</p>
    </div>
);

export default Order;
