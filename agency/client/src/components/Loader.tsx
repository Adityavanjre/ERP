import { motion } from 'framer-motion';

interface LoaderProps {
    size?: number;
    className?: string;
}

const Loader = ({ size = 16, className = '' }: LoaderProps) => {
    return (
        <div className={`flex justify-center items-center ${className}`}>
            <motion.div
                className={`border-4 border-indigo-500/30 border-t-indigo-500 rounded-full`}
                style={{ width: size * 4, height: size * 4 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
        </div>
    );
};

export default Loader;
