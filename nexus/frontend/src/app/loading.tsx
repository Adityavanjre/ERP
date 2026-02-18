"use client"

export default function RootLoading() {
    return (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center space-y-6">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-blue-600 border-r-blue-600/30 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-2 bg-slate-50 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-blue-600 rounded-sm animate-pulse"></div>
                </div>
            </div>
            <div className="text-center space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">
                    Loading Klypso...
                </p>
                <div className="h-1 w-32 bg-slate-100 rounded-full overflow-hidden mx-auto">
                    <div className="h-full bg-blue-600 w-1/2 animate-[loading_2s_ease-in-out_infinite]"></div>
                </div>
            </div>

            <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); width: 20%; }
          50% { transform: translateX(100%); width: 80%; }
          100% { transform: translateX(300%); width: 20%; }
        }
      `}</style>
        </div>
    );
}
