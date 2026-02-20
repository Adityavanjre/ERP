import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LogOut,
    LayoutDashboard,
    Images,
    FileText,
    Send,
    Settings,
    Users,
    Briefcase,
    Search,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen,
    ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            if (mobile) setSidebarOpen(false);
            else setSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuGroups = [
        {
            label: "Control",
            items: [
                { to: "/admin", icon: <LayoutDashboard size={18} />, label: "Intelligence" },
                { to: "/admin/users", icon: <Users size={18} />, label: "Identities" },
                { to: "/admin/enquiries", icon: <Send size={18} />, label: "Signals" },
            ]
        },
        {
            label: "Bespoke Assets",
            items: [
                { to: "/admin/projects", icon: <Images size={18} />, label: "Portfolio" },
                { to: "/admin/blogs", icon: <FileText size={18} />, label: "Knowledge" },
                { to: "/admin/careers", icon: <Briefcase size={18} />, label: "Talent" },
            ]
        },
        {
            label: "Configuration",
            items: [
                { to: "/admin/settings", icon: <Settings size={18} />, label: "Settings" },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 flex font-sans selection:bg-[#C5A059]/30">
            <Helmet>
                <title>Klypso | Executive Panel</title>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>

            {/* Premium Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-[#C5A059]/5 rounded-full blur-[160px]" />
                <div className="noise" />
            </div>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobile && sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45]"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-[#0A0A0B] border-r border-white/5 transition-all duration-500 ease-[0.2,1,0.3,1] flex flex-col ${sidebarOpen ? 'w-72 translate-x-0' : 'w-24 -translate-x-full lg:translate-x-0 lg:w-24'}`}
            >
                {/* Logo Section */}
                <div className="h-24 flex items-center px-8 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#C5A059] rounded-xl flex items-center justify-center font-black text-black shadow-lg shadow-[#C5A059]/10 rotate-3">K</div>
                        {sidebarOpen && (
                            <div className="flex flex-col">
                                <span className="font-bold tracking-tight text-lg text-white font-heading">KLYPSO</span>
                                <span className="text-[#C5A059] font-black text-[9px] uppercase tracking-[0.4em] leading-none mt-1">Console v.02</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-10 px-6 space-y-10 custom-scrollbar relative z-10">
                    {menuGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-3">
                            {sidebarOpen && (
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-4 mb-6">
                                    {group.label}
                                </p>
                            )}
                            {group.items.map((item) => {
                                const isActive = location.pathname === item.to || (item.to !== '/admin' && location.pathname.startsWith(item.to));
                                return (
                                    <Link
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => isMobile && setSidebarOpen(false)}
                                        className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${isActive ? 'bg-white/5 text-white border border-white/10 shadow-xl' : 'text-zinc-500 hover:text-white border border-transparent'}`}
                                        title={sidebarOpen ? "" : item.label}
                                    >
                                        <div className={`${isActive ? 'text-[#C5A059]' : 'text-zinc-600 group-hover:text-zinc-400'} transition-colors shrink-0`}>
                                            {item.icon}
                                        </div>
                                        {sidebarOpen && <span className={`font-bold text-sm tracking-tight ${isActive ? 'text-white' : ''}`}>{item.label}</span>}
                                        {isActive && sidebarOpen && (
                                            <motion.div layoutId="nav-glow" className="ml-auto w-1 h-1 rounded-full bg-[#C5A059] gold-glow" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-6 border-t border-white/5 bg-[#0A0A0B]/50 relative z-10">
                    <div className={`p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center gap-4 ${sidebarOpen ? '' : 'justify-center'}`}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 text-xs font-black shrink-0">
                            {user?.name?.charAt(0) || 'A'}
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse" />
                                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest leading-none">Security Lvl 5</p>
                                </div>
                            </div>
                        )}
                        {sidebarOpen && (
                            <button onClick={handleLogout} className="text-zinc-600 hover:text-[#C5A059] p-2 transition-colors">
                                <LogOut size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={`flex-1 flex flex-col transition-all duration-500 ease-[0.2,1,0.3,1] ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-24'} ml-0`}>
                {/* Header */}
                <header className="h-20 lg:h-24 bg-[#0A0A0B]/60 backdrop-blur-xl sticky top-0 z-40 px-4 lg:px-10 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-4 lg:gap-10">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-3 text-zinc-500 hover:text-white transition-all bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10"
                        >
                            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                        </button>

                        <div className="hidden md:flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                            <span className="hover:text-white transition-colors cursor-pointer">Console</span>
                            <ChevronRight size={10} className="text-zinc-800" />
                            <span className="text-white">
                                {location.pathname === '/admin' ? 'Overview' : location.pathname.split('/').pop()?.replace('-', ' ')}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex items-center gap-8 mr-6 border-r border-white/5 pr-8">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Response Time</span>
                                <span className="text-xs font-mono font-bold text-emerald-500">12ms</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Core Frequency</span>
                                <span className="text-xs font-mono font-bold text-[#C5A059]">4.8GHz</span>
                            </div>
                        </div>

                        <div className="hidden sm:flex relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                            <input
                                type="text"
                                placeholder="Universal Search..."
                                className="bg-white/[0.02] border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-xs focus:outline-none focus:border-[#C5A059]/30 transition-all w-72 text-zinc-200 font-medium"
                            />
                        </div>

                        <a href="/" target="_blank" className="bg-[#C5A059] hover:bg-[#D4AF37] text-black h-10 lg:h-12 px-4 lg:px-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-lg shadow-[#C5A059]/10">
                            <span className="hidden sm:inline">Live Site</span> <ExternalLink size={14} />
                        </a>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-4 lg:p-10 pb-32 max-w-[1600px] mx-auto w-full relative z-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, scale: 0.99, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.99, y: -10 }}
                            transition={{ duration: 0.4, ease: [0.2, 1, 0.3, 1] }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
