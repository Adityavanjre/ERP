import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const Testimonials = () => {
    const testimonials = [
        {
            name: "Sarah Jenkins",
            role: "CTO, SecurePay Systems",
            quote: "Klypso transformed our legacy system into a state-of-the-art platform. Their attention to detail and technical rigor is unmatched.",
            rating: 5
        },
        {
            name: "David Chen",
            role: "Founder, StreamLine",
            quote: "A significant increase in engagement after launching our new app. The design is simply beautiful and ultra-performant.",
            rating: 5
        },
        {
            name: "Elena Rodriguez",
            role: "Brand Director, Mode Luxe",
            quote: "Professional, creative, and incredibly fast. Klypso is now our go-to partner for all digital masterpieces.",
            rating: 5
        }
    ];

    return (
        <section className="py-40 bg-black overflow-hidden relative border-y border-white/5">
            {/* Atmosphere */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] bg-[#C5A059]/3 rounded-full blur-[180px] -z-10" />

            <div className="container mx-auto px-6 max-w-7xl">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-32"
                >
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="h-[1px] w-12 bg-[#C5A059]/30" />
                        <span className="text-[10px] font-black tracking-[0.4em] text-[#C5A059] uppercase">Social Intelligence</span>
                        <div className="h-[1px] w-12 bg-[#C5A059]/30" />
                    </div>
                    <h2 className="text-4xl md:text-8xl font-bold mb-8 tracking-tighter font-heading">The Elite <br /><span className="font-display italic font-light text-[#C5A059]">Consensus.</span></h2>
                    <p className="text-zinc-500 max-w-2xl mx-auto text-xl font-medium leading-relaxed tracking-tight">We align with visionaries who demand absolute technical and aesthetic superiority.</p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {/* Featured Testimonial */}
                    <motion.div
                        className="lg:col-span-2 premium-card p-16 group relative overflow-hidden flex flex-col justify-between"
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                            <Quote size={120} />
                        </div>

                        <div>
                            <div className="flex gap-2 mb-10 text-[#C5A059]">
                                {[...Array(5)].map((_, r) => <Star key={r} size={16} fill="currentColor" />)}
                            </div>
                            <p className="text-3xl md:text-5xl font-display italic text-white leading-tight mb-16 tracking-tight">
                                "Klypso transformed our legacy ecosystem into a state-of-the-art platform. Their attention to detail is truly sovereign."
                            </p>
                        </div>

                        <div className="flex items-center gap-6 pt-10 border-t border-white/5">
                            <div className="w-16 h-16 rounded-2xl bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center font-black text-[#C5A059] text-xl">SJ</div>
                            <div>
                                <h4 className="font-bold text-white tracking-tight text-lg font-heading">Sarah Jenkins</h4>
                                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">Chief Technology Officer, SecurePay</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Secondary Testimonials */}
                    <div className="space-y-12">
                        {testimonials.slice(1).map((t, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                className="premium-card p-12 hover:bg-white/[0.01] transition-all duration-500"
                            >
                                <p className="text-zinc-400 mb-10 font-medium leading-relaxed italic text-lg opacity-80">"{t.quote}"</p>
                                <div className="flex items-center gap-4 pt-8 border-t border-white/5">
                                    <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center font-black text-zinc-500 text-xs">
                                        {t.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-xs uppercase tracking-[0.2em] font-heading">{t.name}</h4>
                                        <p className="text-[10px] text-[#C5A059] font-black uppercase tracking-widest mt-1">{t.role.split(',')[0]}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
