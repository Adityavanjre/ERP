import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, ChevronLeft, ChevronRight, Grid, MapPin, Camera } from 'lucide-react';
import SEO from '../components/SEO';

const albums = [
    {
        id: 'wedding',
        title: 'Weddings',
        subtitle: 'Unforgettable Moments',
        description: 'Cinematic captures of love stories and traditional Indian heritage.',
        location: 'Coastal Bharat',
        cover: 'https://images.unsplash.com/photo-1621621667797-e06afc217fb0?q=80&w=1200',
        count: 12
    },
    {
        id: 'culture',
        title: 'Heritage',
        subtitle: 'Living History',
        description: 'Architectural marvels and the deep soul of ancient Indian culture.',
        location: 'Heritage Sites',
        cover: 'https://images.unsplash.com/photo-1582510003544-4d00b7f5feee?q=80&w=1200',
        count: 15
    },
    {
        id: 'portrait',
        title: 'Portraits',
        subtitle: 'Human Essence',
        description: 'Raw, authentic character studies of the people who define the landscape.',
        location: 'Pan-India',
        cover: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200',
        count: 10
    }
];

const photoCollection = [
    { id: 'w1', albumId: 'wedding', url: 'https://images.unsplash.com/photo-1621621667797-e06afc217fb0?q=80&w=1200', title: 'Golden Union', location: "Chennai" },
    { id: 'w2', albumId: 'wedding', url: 'https://images.unsplash.com/photo-1595521624438-2358bc7e64a1?q=80&w=1200', title: 'Sacred Ritual', location: "Madurai" },
    { id: 'w3', albumId: 'wedding', url: 'https://images.unsplash.com/photo-1605278077556-98dc427357c9?q=80&w=1200', title: 'Eternal Garlands', location: "Kerala" },
    { id: 'c1', albumId: 'culture', url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f5feee?q=80&w=1200', title: 'Temple Majesty', location: "Madurai" },
    { id: 'c2', albumId: 'culture', url: 'https://images.unsplash.com/photo-1591266014389-c45479532598?q=80&w=1200', title: 'Lost Kingdom', location: "Hampi" },
    { id: 'p1', albumId: 'portrait', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200', title: 'Urban Legend', location: "Chennai" },
    { id: 'p2', albumId: 'portrait', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200', title: 'Legacy Eyes', location: "Erode" },
];

const Photography = () => {
    const [activeAlbum, setActiveAlbum] = useState<null | string>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);


    useEffect(() => {
        window.scrollTo(0, 0);
    }, [activeAlbum]);

    const displayedPhotos = activeAlbum
        ? photoCollection.filter(p => p.albumId === activeAlbum)
        : [];

    const handleImageLoad = () => {
        // Log image load if needed or remove entirely
    };

    const openLightbox = (index: number) => {
        setLightboxIndex(index);
    };
    const closeLightbox = () => {
        setLightboxIndex(null);
    };

    useEffect(() => {
        if (lightboxIndex !== null) {
            document.documentElement.classList.add('no-scroll');
        } else {
            document.documentElement.classList.remove('no-scroll');
        }
        return () => {
            document.documentElement.classList.remove('no-scroll');
        };
    }, [lightboxIndex]);

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white pt-48 pb-32">
            <SEO title="Photography | Klypso Agency" description="Professional high-end photography and cinematic production." />

            {/* Noise Overflow */}
            <div className="noise" />

            <div className="container mx-auto px-6 max-w-7xl relative z-10">

                <AnimatePresence mode="wait">
                    {!activeAlbum ? (
                        <motion.div
                            key="album-grid"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            className="space-y-40"
                        >
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-4 mb-10">
                                    <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                                    <span className="text-[10px] font-black tracking-[0.5em] text-[#C5A059] uppercase">
                                        Our Gallery
                                    </span>
                                    <div className="h-[1px] w-12 bg-[#C5A059]/40" />
                                </div>
                                <h1 className="text-5xl sm:text-7xl md:text-[10rem] font-bold mb-12 tracking-tight leading-[0.85] font-heading">
                                    Capture <br />
                                    <span className="font-display italic font-light text-[#C5A059]">Soul.</span>
                                </h1>
                                <p className="max-w-2xl mx-auto text-xl text-zinc-500 font-medium underline underline-offset-4 decoration-[#C5A059]/20">
                                    Crafting visual narratives with cinematic precision. We capture moments that become timeless legacies.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                                {albums.map((album) => (
                                    <motion.div
                                        key={album.id}
                                        whileHover={{ y: -10 }}
                                        onClick={() => setActiveAlbum(album.id)}
                                        className="group cursor-pointer premium-card p-6 border-white/5"
                                    >
                                        <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] mb-10">
                                            <img
                                                src={album.cover}
                                                alt={album.title}
                                                className="w-full h-full object-cover grayscale brightness-75 transition-all duration-1000 group-hover:scale-110 group-hover:grayscale-0 group-hover:brightness-100"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                                            <div className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Grid size={18} />
                                            </div>
                                        </div>

                                        <div className="px-4 pb-4">
                                            <div className="flex justify-between items-end mb-4">
                                                <h2 className="text-4xl font-bold font-heading group-hover:text-[#C5A059] transition-colors">{album.title}</h2>
                                                <span className="text-[10px] font-black text-[#C5A059] uppercase tracking-widest">{album.count} Photos</span>
                                            </div>
                                            <p className="text-zinc-500 font-medium text-lg italic font-display mb-4">{album.subtitle}</p>
                                            <p className="text-zinc-600 text-sm max-w-sm leading-relaxed">{album.description}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="album-gallery"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="space-y-20 px-4"
                        >
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 border-b border-white/5 pb-12">
                                <div>
                                    <button
                                        onClick={() => setActiveAlbum(null)}
                                        className="mb-10 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 hover:text-[#C5A059] transition-colors"
                                    >
                                        <ArrowLeft size={16} /> Back to Albums
                                    </button>
                                    <h1 className="text-5xl sm:text-7xl md:text-[10rem] font-bold text-white tracking-tight leading-[0.85] font-heading">
                                        {albums.find(a => a.id === activeAlbum)?.title}
                                    </h1>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl text-[#C5A059] font-display italic mb-2">
                                        {albums.find(a => a.id === activeAlbum)?.subtitle}
                                    </p>
                                    <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest flex items-center justify-end gap-3">
                                        <MapPin size={12} className="text-[#C5A059]" /> {albums.find(a => a.id === activeAlbum)?.location}
                                    </p>
                                </div>
                            </div>

                            <div className="columns-1 md:columns-2 lg:columns-3 gap-12 space-y-12">
                                {displayedPhotos.map((photo, index) => (
                                    <motion.div
                                        key={photo.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.05 }}
                                        className="break-inside-avoid relative group"
                                        onClick={() => openLightbox(index)}
                                    >
                                        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#121214] border border-white/5 p-4 shadow-3xl">
                                            <img
                                                src={photo.url}
                                                alt={photo.title}
                                                onLoad={handleImageLoad}
                                                className={`w-full h-auto block rounded-[1.8rem] grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-[1.02] shadow-2xl`}
                                            />


                                        </div>
                                        <div className="mt-8 flex justify-between items-center px-4">
                                            <div>
                                                <h3 className="text-sm font-bold text-white mb-1 font-heading uppercase tracking-widest">{photo.title}</h3>
                                                <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.3em]">{photo.location}</p>
                                            </div>
                                            <Camera size={14} className="text-zinc-800" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Lightbox Overhaul */}
            <AnimatePresence>
                {lightboxIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-[#0A0A0B]/98 backdrop-blur-3xl flex items-center justify-center p-10"
                        onClick={closeLightbox}
                    >
                        <div className="absolute top-10 right-10 flex items-center gap-10">
                            <div className="hidden lg:flex flex-col items-end">
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-1">{displayedPhotos[lightboxIndex].title}</span>
                                <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.4em]">{displayedPhotos[lightboxIndex].location}</span>
                            </div>
                            <button onClick={closeLightbox} className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-[#C5A059] hover:text-black transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <motion.img
                            key={lightboxIndex}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            src={displayedPhotos[lightboxIndex].url}
                            className="max-h-full max-w-full object-contain rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5"
                            onClick={(e) => e.stopPropagation()}
                        />

                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 sm:gap-8 bg-black/40 backdrop-blur-2xl px-6 sm:px-10 py-5 rounded-full border border-white/10">
                            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + displayedPhotos.length) % displayedPhotos.length) }} className="text-zinc-500 hover:text-[#C5A059] transition-colors"><ChevronLeft size={24} className="sm:w-8 sm:h-8" /></button>
                            <div className="w-[1px] h-6 bg-white/10" />
                            <span className="text-[10px] sm:text-xs font-black text-white tracking-[0.3em]">{lightboxIndex + 1} / {displayedPhotos.length}</span>
                            <div className="w-[1px] h-6 bg-white/10" />
                            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % displayedPhotos.length) }} className="text-zinc-500 hover:text-[#C5A059] transition-colors"><ChevronRight size={24} className="sm:w-8 sm:h-8" /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Photography;
