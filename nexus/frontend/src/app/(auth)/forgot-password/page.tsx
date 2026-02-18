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
import { api } from "@/lib/api"
import { ArrowLeft, MailCheck } from "lucide-react"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            await api.post("auth/forgot-password", { email })
            setSuccess(true)
        } catch (err: any) {
            setError(err.response?.data?.message || "Something went wrong. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 selection:bg-blue-500/10">
                <Card className="w-full max-w-md bg-white border-slate-200 shadow-2xl relative z-10 rounded-[2.5rem] p-4 text-center">
                    <CardHeader className="space-y-4 pb-8">
                        <div className="flex justify-center">
                            <div className="p-4 rounded-full bg-blue-50 border border-blue-100 text-blue-600">
                                <MailCheck size={48} strokeWidth={1.5} />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-extrabold tracking-tight uppercase">Check Email</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">
                            If an account exists for {email}, we've sent a recovery link.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex flex-col gap-4 pb-8">
                        <Link href="/login" className="w-full">
                            <Button variant="outline" className="w-full border-slate-200 text-slate-600 font-black h-12 rounded-xl uppercase tracking-widest text-[10px]">
                                Back to Sign In
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 selection:bg-blue-500/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent)] pointer-events-none" />

            <Card className="w-full max-w-md bg-white border-slate-200 shadow-2xl relative z-10 rounded-[2.5rem] p-4">
                <CardHeader className="space-y-1 pb-8 text-center">
                    <CardTitle className="text-3xl font-extrabold tracking-tight uppercase">Recovery</CardTitle>
                    <CardDescription className="text-slate-500 font-medium lowercase">
                        Enter your work email to receive a recovery link.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        {error && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider" role="alert">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-500 font-bold text-[10px] uppercase tracking-widest ml-1">Work Email Address</Label>
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
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 pb-8">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-12 rounded-xl transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest text-xs" disabled={loading}>
                            {loading ? "Sending..." : "Send Reset Link"}
                        </Button>
                        <Link href="/login" className="text-[10px] flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold uppercase tracking-tighter transition-colors">
                            <ArrowLeft size={10} />
                            Back to Sign In
                        </Link>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
