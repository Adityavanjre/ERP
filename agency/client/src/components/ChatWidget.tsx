import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ChatWidget = () => {
    // Replace with your actual WhatsApp phone number
    const phoneNumber = "919449734414";
    const message = encodeURIComponent("Hello Klypso, I'm interested in your services.");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

    return (
        <div className="fixed bottom-10 left-10 z-50 flex items-center group">
            <motion.a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="relative bg-[#C5A059] text-black p-4 rounded-[1.2rem] shadow-[0_10px_30px_rgba(197,160,89,0.2)] flex items-center justify-center hover:bg-[#D4AF37] transition-all duration-300 z-10"
                aria-label="Chat on WhatsApp"
            >
                <div className="absolute inset-0 rounded-[1.2rem] animate-pulse bg-[#C5A059] opacity-30 -z-10 blur-xl" />
                <MessageCircle size={24} className="fill-black" />
            </motion.a>

            <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                whileInView={{ opacity: 0 }} // Default hidden
                whileHover={{ opacity: 1, x: 0, scale: 1 }} // Fallback if group hover fails
                className="ml-4 bg-zinc-900/90 backdrop-blur-xl border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-3 rounded-2xl opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all duration-500 pointer-events-none shadow-2xl whitespace-nowrap border-l-indigo-500/50 border-l-2"
            >
                Connect with us
            </motion.div>
        </div>
    );
};

export default ChatWidget;
