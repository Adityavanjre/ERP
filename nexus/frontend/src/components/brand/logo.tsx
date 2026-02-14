import React from 'react';

export const KlypsoLogo = ({ collapsed = false, size = 40 }: { collapsed?: boolean; size?: number }) => {
    return (
        <div className="group flex items-center gap-4 select-none">
            <div
                style={{ width: size, height: size }}
                className="bg-[#C5A059] rounded-xl flex items-center justify-center font-black text-black shadow-lg shadow-[#C5A059]/10 transition-transform"
            >
                <span style={{ fontSize: size * 0.5 }}>K</span>
            </div>
            {!collapsed && (
                <span
                    style={{ fontSize: size * 0.6 }}
                    className="font-black text-slate-900 tracking-tighter transition-colors font-sans uppercase"
                >
                    KLYPSO
                </span>
            )}
        </div>
    );
};
