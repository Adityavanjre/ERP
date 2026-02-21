import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import AuthGuard from "@/components/auth/auth-guard";
import { CommandPalette } from "@/components/layout/command-palette";

const DashboardLayout = ({
    children
}: {
    children: React.ReactNode;
}) => {
    return (
        <AuthGuard>
            <div className="h-screen bg-white text-slate-900 overflow-hidden relative">
                <CommandPalette />
                <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] border-r border-slate-100 bg-slate-50/50">
                    <Sidebar />
                </div>
                <div className="md:pl-72 h-full flex flex-col overflow-hidden">
                    <Navbar />
                    <main className="flex-1 overflow-y-auto scrollbar-hide">
                        <div className="max-w-[1700px] mx-auto min-h-full p-4 sm:p-6 md:p-8 lg:p-12">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}

export default DashboardLayout;
