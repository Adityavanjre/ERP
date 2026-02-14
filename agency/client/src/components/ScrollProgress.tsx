import { motion, useScroll } from 'framer-motion';

const ScrollProgress = () => {
    const { scrollYProgress } = useScroll();

    return (
        <motion.div
            className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#C5A059] to-[#7C3AED] origin-left z-[99999]"
            style={{ scaleX: scrollYProgress }}
        />
    );
};

export default ScrollProgress;
