import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 50);

      if (currentScrollY > 150 && !isOpen) {
        if (currentScrollY > lastScrollY) {
          setHidden(true);
        } else {
          setHidden(false);
        }
      } else {
        setHidden(false);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Resources', path: '/resources' },
    { name: 'Careers', path: '/careers' },
    { name: 'Portal', path: '/portal', external: true },
  ];

  return (
    <header className={`fixed w-full top-0 z-[100] transition-all duration-700 py-6 pointer-events-none lg:pointer-events-auto ${hidden ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
      <div className={`container mx-auto px-4 transition-all duration-700 pointer-events-auto ${scrolled ? 'max-w-6xl' : 'max-w-7xl'}`}>
        <div className={`flex justify-between items-center transition-all duration-700 px-6 lg:px-10 py-5 ${scrolled
          ? 'bg-[#0A0A0B]/80 backdrop-blur-3xl border border-white/5 shadow-2xl rounded-[2.5rem]'
          : 'bg-transparent border border-transparent'
          }`}>

          {/* Logo */}
          <NavLink to="/" className="group flex items-center gap-4">
            <div className="w-10 h-10 bg-[#C5A059] rounded-xl flex items-center justify-center font-black text-black text-xl shadow-lg shadow-[#C5A059]/20 group-hover:rotate-6 transition-transform">
              K
            </div>
            <span className="text-2xl font-black text-white tracking-tight group-hover:text-[#C5A059] transition-colors font-heading">
              KLYPSO
            </span>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-12">
            <div className="flex gap-4 xl:gap-8">
              {navLinks.map((link) => (
                link.external ? (
                  <a
                    key={link.name}
                    href={link.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-black tracking-[0.4em] uppercase transition-all relative group text-[#C5A059] hover:text-[#D4AF37]"
                  >
                    {link.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#C5A059] group-hover:w-full transition-all duration-500" />
                  </a>
                ) : (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    className={({ isActive }) =>
                      `text-[10px] font-black tracking-[0.4em] uppercase transition-all relative group ${isActive
                        ? 'text-[#C5A059]'
                        : 'text-zinc-500 hover:text-white'
                      }`
                    }
                  >
                    {link.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#C5A059] group-hover:w-full transition-all duration-500" />
                  </NavLink>
                )
              ))}
            </div>

            <NavLink
              to="/contact"
              className="bg-[#C5A059] text-black h-12 px-8 rounded-full font-black text-[10px] tracking-[0.2em] uppercase hover:bg-[#D4AF37] transition-all transform hover:scale-105 flex items-center group shadow-lg shadow-[#C5A059]/10"
            >
              Initiate
              <ArrowUpRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </NavLink>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="lg:hidden w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-white focus:outline-none hover:bg-white/10 transition-all"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="lg:hidden absolute top-full left-0 w-full p-4 pointer-events-auto"
          >
            <div className="bg-[#0A0A0B]/95 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-12 shadow-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/5 rounded-full blur-[100px] -z-10" />

              <nav className="flex flex-col gap-8">
                {navLinks.map((link, idx) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    {link.external ? (
                      <a
                        href={link.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-4xl font-bold tracking-tight transition-all block font-heading text-[#C5A059]"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <NavLink
                        to={link.path}
                        onClick={() => setIsOpen(false)}
                        className={({ isActive }) =>
                          `text-4xl font-bold tracking-tight transition-all block font-heading ${isActive ? 'text-[#C5A059]' : 'text-zinc-500 hover:text-white'
                          }`
                        }
                      >
                        {link.name}
                      </NavLink>
                    )}
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="pt-10 border-t border-white/5 mt-4"
                >
                  <NavLink
                    to="/contact"
                    onClick={() => setIsOpen(false)}
                    className="bg-[#C5A059] text-black w-full py-6 rounded-[2rem] font-black text-center text-xs uppercase tracking-[0.3em] block shadow-xl shadow-[#C5A059]/20"
                  >
                    Engage Now
                  </NavLink>
                </motion.div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
