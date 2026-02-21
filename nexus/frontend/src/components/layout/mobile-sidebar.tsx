"use client";

import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

export const MobileSidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isOpen]);

    if (!isMounted) {
        return (
            <button className="md:hidden p-2 -ml-2 mr-4 text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                <Menu className="h-5 w-5" />
            </button>
        );
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="md:hidden p-2 -ml-2 mr-4 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
                <Menu className="h-5 w-5" />
            </button>

            {isOpen && createPortal(
                <>
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] md:hidden transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="fixed inset-y-0 left-0 w-72 bg-white z-[100] md:hidden shadow-2xl transition-transform duration-300 ease-in-out">
                        <Sidebar onItemClick={() => setIsOpen(false)} />
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
