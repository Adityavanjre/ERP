import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const NotFound = () => {
    return (
        <section className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
            <Helmet>
                <title>404 - Page Not Found | Klypso</title>
                <meta name="robots" content="noindex" />
            </Helmet>
            <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center"
            >
                <h1 className="text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">
                    404
                </h1>
                <h2 className="text-2xl md:text-4xl font-bold mt-4 mb-6">Page Not Found</h2>
                <p className="text-gray-400 max-w-md mx-auto mb-8 text-lg">
                    Oops! The page you are looking for seems to have drifted into digital space.
                </p>
                <Link to="/" className="btn-primary inline-flex items-center group">
                    <Home className="mr-2 w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                    Back to Home
                </Link>
            </motion.div>
        </section>
    );
};

export default NotFound;
