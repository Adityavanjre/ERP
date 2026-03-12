"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"

function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get("token")
    const email = searchParams.get("email")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match")
            return
        }
        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setLoading(true)
        setError("")

        try {
            await api.post("auth/reset-password", {
                token,
                email,
                newPassword
            })
            toast.success("Password reset successful!")
            router.push("/login")
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || "Invalid or expired token")
        } finally {
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Card className="w-full max-w-md bg-white border-slate-200 shadow-2xl rounded-[2.5rem] p-4 text-center">
                    <CardHeader className="space-y-4">
                        <CardTitle className="text-3xl font-extrabold tracking-tight uppercase text-rose-600">Error</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">
                            Invalid or missing recovery token.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => router.push("/login")}>
                            Back to Sign In
                        </Button>
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
                    <div className="flex justify-center mb-4">
                        <ShieldCheck className="text-blue-600" size={40} />
                    </div>
                    <CardTitle className="text-3xl font-extrabold tracking-tight uppercase">Set Password</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">
                        Create a secure new password for your account.
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
                            <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-widest ml-1">New Password</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    className="bg-slate-50 border-slate-200 text-slate-900 h-12 rounded-xl px-4 pr-10"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-widest ml-1">Confirm Password</Label>
                            <Input
                                type="password"
                                className="bg-slate-50 border-slate-200 text-slate-900 h-12 rounded-xl px-4"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="pb-8">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-12 rounded-xl shadow-lg shadow-blue-500/20 uppercase tracking-widest text-xs" disabled={loading}>
                            {loading ? "Updating..." : "Update Password"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    )
}
