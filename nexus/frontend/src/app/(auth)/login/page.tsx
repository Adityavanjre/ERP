"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { toast } from "sonner"

import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await api.post("auth/login/web", { email, password })
            localStorage.setItem("k_token", res.data.accessToken)
            localStorage.setItem("k_identity", res.data.accessToken)
            localStorage.setItem("k_user", JSON.stringify(res.data.user))

            // Restore session flow
            const returnTo = localStorage.getItem("return_to")
            if (returnTo) {
                localStorage.removeItem("return_to")
                router.push(returnTo)
            } else {
                router.push("/dashboard")
            }
        } catch (err: any) {
            console.error(err);
            if (!err.response) {
                setError("Network Error: Unable to reach the server. Please check your connection or try again later.");
            } else {
                setError(err.response?.data?.message || "Invalid credentials");
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 selection:bg-blue-500/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent)] pointer-events-none" />

            <Card className="w-full max-w-md bg-white border-slate-200 shadow-2xl relative z-10 rounded-[2.5rem] p-4">
                <CardHeader className="space-y-1 pb-8">
                    <div className="flex justify-center mb-6">
                        <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/20">
                                K
                            </div>
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-extrabold text-center text-slate-900 tracking-tight uppercase">Sign In</CardTitle>
                    <CardDescription className="text-center text-slate-500 font-medium">
                        Welcome back. Enter your details to continue.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-6">
                        {error && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider animate-in fade-in zoom-in-95" role="alert">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-500 font-bold text-[10px] uppercase tracking-widest ml-1">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                className="bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 h-12 rounded-xl font-medium px-4"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <Label htmlFor="password" className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Password</Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 cursor-pointer uppercase tracking-tighter transition-colors"
                                >
                                    Recovery?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    className="bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/20 focus:border-blue-500 h-12 rounded-xl px-4 pr-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 pb-8">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-12 rounded-xl transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest text-xs" disabled={loading}>
                            {loading ? "Logging in..." : "Sign In"}
                        </Button>
                        <div className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-tighter">
                            New here?{" "}
                            <Link href="/register" className="text-blue-600 hover:text-blue-700">
                                Create an account
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
