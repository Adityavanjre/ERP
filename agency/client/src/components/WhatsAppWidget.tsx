import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const WhatsAppWidget = () => {
    // Replace with actual WhatsApp number
    const phoneNumber = "919449734414";
    const message = encodeURIComponent("Hello Klypso, I'm interested in your services.");

    return (
        <motion.a
            href={`https://wa.me/${phoneNumber}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:shadow-green-500/30 transition-shadow flex items-center justify-center group"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.1 }}
            title="Chat on WhatsApp"
        >
            <MessageCircle size={28} fill="white" className="group-hover:animate-pulse" />
            <span className="absolute right-full mr-3 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none">
                Chat with us
            </span>
        </motion.a>
    );
};

export default WhatsAppWidget;
