import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasConsented = localStorage.getItem('klypso_cookie_consent');
        if (!hasConsented) {
            // Small delay to not overwhelm the user immediately
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('klypso_cookie_consent', 'true');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-0 left-0 right-0 z-[100] p-4 flex justify-center"
                >
                    <div className="bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl max-w-4xl w-full flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-sm text-gray-300">
                            <p className="font-bold text-white mb-1">We respect your privacy.</p>
                            <p>
                                We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
                                By clicking "Accept All", you consent to our use of cookies. Read our <Link to="/legal" className="text-indigo-400 hover:underline">Privacy Policy</Link>.
                            </p>
                        </div>
                        <div className="flex gap-4 shrink-0">
                            <button
                                onClick={() => setIsVisible(false)}
                                className="text-sm font-medium text-gray-400 hover:text-white px-4 py-2 transition-colors"
                            >
                                Decline
                            </button>
                            <button
                                onClick={handleAccept}
                                className="btn-primary text-sm px-6 py-2 rounded-lg"
                            >
                                Accept All
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CookieConsent;
