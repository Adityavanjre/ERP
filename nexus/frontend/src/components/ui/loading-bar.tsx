"use client";

"use client"

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function LoadingBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        const timeout = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timeout);
    }, [pathname, searchParams]);

    if (!loading) return null;

    return (
        <div className="fixed top-0 left-0 right-0 h-[2px] z-[9999] overflow-hidden bg-transparent">
            <div className="h-full bg-indigo-500 animate-progress-bar shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            <style jsx>{`
                .animate-progress-bar {
                    animation: progress 2s ease-in-out infinite;
                    width: 100%;
                }
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(0); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
