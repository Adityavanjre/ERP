import { Instagram, Twitter, Linkedin, ArrowUpRight, Mail, Phone, MapPin } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer bg-[#0A0A0B] text-zinc-400 pt-32 lg:pt-48 border-t border-white/5 mt-auto overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C5A059]/30 to-transparent" />

      {/* Massive CTA Section - Editorial Scale */}
      <div className="container mx-auto px-4 mb-32 lg:mb-48 text-center relative">
        <h2 className="text-[14vw] font-bold leading-none tracking-tighter text-white opacity-[0.02] select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full font-heading">
          KLYPSO
        </h2>
        <div className="relative z-10 flex flex-col items-center">
          <NavLink to="/contact" className="group flex flex-col items-center gap-10">
            <span className="text-4xl md:text-8xl font-bold text-white group-hover:text-[#C5A059] transition-all duration-700 font-heading tracking-tight">
              Build Your <br />
              <span className="font-display italic font-light text-[#C5A059]">Digital Masterpiece.</span>
            </span>
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#C5A059] text-black flex items-center justify-center group-hover:scale-110 transition-all duration-700 shadow-2xl">
              <ArrowUpRight size={48} className="group-hover:rotate-45 transition-transform duration-700" />
            </div>
          </NavLink>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-24 mb-32 border-t border-white/5 pt-24">
          <div className="lg:col-span-1 space-y-10">
            <div className="group flex items-center gap-4">
              <div className="w-10 h-10 bg-[#C5A059] rounded-xl flex items-center justify-center font-black text-black text-lg shadow-lg">K</div>
              <span className="text-2xl font-black text-white tracking-tight font-heading">KLYPSO</span>
            </div>

            <p className="text-sm font-medium leading-relaxed max-w-xs text-zinc-500 italic">
              A boutique digital agency specialized in engineering high-performance systems and bespoke brand identities.
            </p>

            <div className="flex gap-4">
              <SocialLink icon={<Instagram size={18} />} />
              <SocialLink icon={<Linkedin size={18} />} />
              <SocialLink icon={<Twitter size={18} />} />
            </div>
          </div>

          <div className="space-y-10">
            <h3 className="text-white font-black uppercase tracking-[0.4em] text-[10px]">Expertise</h3>
            <ul className="space-y-6 text-sm font-medium">
              <li><NavLink to="/services" className="hover:text-[#C5A059] transition-colors">Web Systems</NavLink></li>
              <li><NavLink to="/services" className="hover:text-[#C5A059] transition-colors">Mobile Platforms</NavLink></li>
              <li><NavLink to="/services" className="hover:text-[#C5A059] transition-colors">Cinematic Visuals</NavLink></li>
              <li><NavLink to="/services" className="hover:text-[#C5A059] transition-colors">Market Domination</NavLink></li>
            </ul>
          </div>

          <div className="space-y-10">
            <h3 className="text-white font-black uppercase tracking-[0.4em] text-[10px]">Explore</h3>
            <ul className="space-y-6 text-sm font-medium">
              <li><NavLink to="/about" className="hover:text-[#C5A059] transition-colors">About Us</NavLink></li>
              <li><NavLink to="/portfolio" className="hover:text-[#C5A059] transition-colors">Portfolio</NavLink></li>
              <li><NavLink to="/careers" className="hover:text-[#C5A059] transition-colors">Careers</NavLink></li>
              <li><NavLink to="/resources" className="hover:text-[#C5A059] transition-colors">Resources</NavLink></li>
            </ul>
          </div>

          <div className="space-y-10">
            <h3 className="text-white font-black uppercase tracking-[0.4em] text-[10px]">Contact</h3>
            <div className="space-y-6 text-sm font-medium">
              <div className="flex gap-4">
                <Mail size={16} className="text-[#C5A059] shrink-0" />
                <a href="mailto:klypsoproduct@gmail.com" className="hover:text-white transition-colors">klypsoproduct@gmail.com</a>
              </div>
              <div className="flex gap-4">
                <Phone size={16} className="text-[#C5A059] shrink-0" />
                <a href="tel:+919449734414" className="hover:text-white transition-colors">+91 944 973 4414</a>
              </div>
              <div className="flex gap-4">
                <MapPin size={16} className="text-[#C5A059] shrink-0" />
                <p>Cyber Hub • Bangalore, India</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10 text-[9px] uppercase tracking-[0.5em] font-black text-zinc-700">
          <p>© {new Date().getFullYear()} KLYPSO. Crafting Digital Legacies.</p>
          <div className="flex gap-6 sm:gap-12">
            <NavLink to="/login" className="hover:text-[#C5A059] transition-colors">Admin Access</NavLink>
            <NavLink to="/legal" className="hover:text-white transition-colors">Legal</NavLink>
            <NavLink to="/legal" className="hover:text-white transition-colors">Privacy</NavLink>
          </div>
        </div>
      </div>
    </footer>
  );
};

const SocialLink = ({ icon }: { icon: React.ReactNode }) => (
  <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-600 hover:bg-[#C5A059] hover:text-black transition-all duration-500 cursor-pointer shadow-xl">
    {icon}
  </div>
);

export default Footer;
