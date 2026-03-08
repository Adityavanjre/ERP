import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-8 animate-bounce">
                <Search className="h-10 w-10 text-blue-600" />
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-4 tracking-tighter">
                404 - Path <span className="text-blue-600">Not Found</span>
            </h1>

            <p className="max-w-md text-slate-600 text-lg mb-12 font-medium">
                The imperial standard doesn&apos;t usually fail, but this route seems to have disappeared. Let&apos;s get you back to the platform.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                <Link href="/" className="w-full">
                    <Button variant="outline" className="w-full h-14 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 font-bold group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Button>
                </Link>
                <Link href="/register" className="w-full">
                    <Button className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20">
                        Start Free Trial
                    </Button>
                </Link>
            </div>

            <div className="mt-20 pt-10 border-t border-slate-200 w-full max-w-2xl">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 italic">Quick Solution Links</h3>
                <div className="flex flex-wrap justify-center gap-4">
                    {["Manufacturing", "Healthcare", "Construction", "Logistics", "Retail"].map((industry) => (
                        <Link
                            key={industry}
                            href={`/industries/${industry.toLowerCase()}`}
                            className="px-4 py-2 bg-white border border-slate-100 rounded-full text-sm font-bold text-slate-600 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
                        >
                            Nexus for {industry}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
