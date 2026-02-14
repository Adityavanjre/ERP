import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet-async';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { login, isLoading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await login(email, password);
            navigate('/admin');
        } catch (err: unknown) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Authentication Failed');
        }
    };

    return (
        <section className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center p-6 relative overflow-hidden">
            <Helmet>
                <title>Nexus Authentication | Klypso</title>
                <meta name="robots" content="noindex" />
            </Helmet>

            <div className="absolute top-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-[#C5A059]/5 rounded-full blur-[200px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-[#C5A059]/5 rounded-full blur-[150px]" />
            <div className="noise opacity-20" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg relative z-10"
            >
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-4 bg-white/[0.02] border border-white/5 rounded-3xl mb-8 shadow-2xl">
                        <Lock className="w-10 h-10 text-[#C5A059]" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 font-heading">
                        Imperial <span className="text-[#C5A059] italic font-display font-medium">Nexus</span>
                    </h1>
                    <p className="text-zinc-500 font-medium text-sm tracking-wide">Enter credentials to initialize secure uplink.</p>
                </div>

                <div className="bg-[#121214] border border-white/5 rounded-[3rem] p-8 md:p-12 shadow-3xl backdrop-blur-xl group">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-3xl mb-10 text-xs font-bold uppercase tracking-widest text-center flex items-center justify-center gap-3"
                        >
                            <ShieldCheck size={16} /> {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-2">Secure Identifier</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-[#C5A059]/40 transition-all font-medium placeholder:text-zinc-800"
                                placeholder="admin@klypso.agency"
                                required
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-2">Encryption Key</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-[#C5A059]/40 transition-all font-medium placeholder:text-zinc-800"
                                placeholder="••••••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#C5A059] text-black py-7 rounded-2xl font-black flex items-center justify-center gap-4 hover:bg-[#D4AF37] transition-all duration-500 shadow-2xl shadow-[#C5A059]/20 disabled:opacity-50 group text-[10px] uppercase tracking-[0.4em]"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} /> Validating...
                                </>
                            ) : (
                                <>
                                    Initialize Uplink <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700">
                        System Version 2.0.4 // Zero-Trust Active
                    </p>
                </div>
            </motion.div>
        </section>
    );
};

export default Login;
