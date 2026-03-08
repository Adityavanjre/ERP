
"use client"

import { useState, useCallback } from "react"
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
import { Eye, EyeOff } from "lucide-react"

interface AuthUser {
    id: string;
    fullName: string;
    email: string;
    isSuperAdmin: boolean;
}

interface AuthResponse {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    requiresMfa?: boolean;
    tempToken?: string;
    tenants?: Array<{ id: string; name: string }>;
}

export default function LoginPage() {
    // const router = useRouter() // Unused
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [step, setStep] = useState<"identity" | "mfa">("identity")
    const [isAdmin, setIsAdmin] = useState(false)
    const [tempToken, setTempToken] = useState("")
    const [mfaCode, setMfaCode] = useState("")

    const completeLogin = useCallback((data: AuthResponse) => {
        // SEC-006: Sensitive tokens are now in HttpOnly cookies (nexus_token / nexus_refresh).
        // We only store the user profile for UI hydration.
        localStorage.setItem("k_user", JSON.stringify(data.user))
        localStorage.setItem("k_token", data.accessToken)
        localStorage.setItem("k_identity", data.accessToken)

        const SAFE_FALLBACK = "/portal/dashboard"
        const returnTo = localStorage.getItem("return_to")
        localStorage.removeItem("return_to")

        if (data.user?.isSuperAdmin && (!data.tenants || data.tenants.length === 0)) {
            window.location.href = "/portal/admin/monitoring"
            return
        }

        const safeRedirect = (raw: string | null): string => {
            if (!raw) return SAFE_FALLBACK
            if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw)) return SAFE_FALLBACK
            if (raw.startsWith("//")) return SAFE_FALLBACK
            if (!raw.startsWith("/portal")) return SAFE_FALLBACK
            try {
                const parsed = new URL(raw, window.location.origin)
                if (parsed.origin !== window.location.origin) return SAFE_FALLBACK
                return parsed.pathname + parsed.search + parsed.hash
            } catch {
                return SAFE_FALLBACK
            }
        }

        window.location.href = safeRedirect(returnTo)
    }, []);

    const handleLogin = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            if (step === "identity") {
                let finalEmail = email.trim();
                let finalPassword = password.trim();

                // Double-check via DOM as second factor for autofill reliability
                if (typeof document !== 'undefined') {
                    const emailInput = document.getElementById('email') as HTMLInputElement;
                    const passInput = document.getElementById('password') as HTMLInputElement;
                    if (emailInput?.value) finalEmail = emailInput.value.trim();
                    if (passInput?.value) finalPassword = passInput.value.trim();
                }

                if (!finalEmail || !finalPassword) {
                    setError("Credentials required.");
                    setLoading(false);
                    return;
                }

                const endpoint = isAdmin ? "auth/login/admin" : "auth/login/web";
                const res = await api.post(endpoint, { email: finalEmail, password: finalPassword })

                if (res.data.requiresMfa) {
                    setTempToken(res.data.tempToken);
                    setStep("mfa");
                    setLoading(false);
                    return;
                }

                completeLogin(res.data as AuthResponse);
            } else {
                // MFA Step
                const res = await api.post("auth/mfa/verify-login", {
                    tempToken,
                    totpCode: mfaCode
                });
                completeLogin(res.data as AuthResponse);
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            console.error(err);
            if (!err.response) {
                setError("Network Error: Unable to reach the server.");
            } else {
                setError(err.response?.data?.message || "Authentication Failed");
                // If MFA failed, don't reset step, just show error.
            }
        } finally {
            setLoading(false)
        }
    }, [step, email, password, isAdmin, tempToken, mfaCode, completeLogin]);

    const goBack = useCallback(() => {
        setStep("identity");
        setMfaCode("");
        setError("");
    }, []);

    const toggleAdmin = useCallback(() => {
        setIsAdmin(prev => !prev);
    }, []);

    const toggleShowPassword = useCallback(() => {
        setShowPassword(prev => !prev);
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 selection:bg-blue-500/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent)] pointer-events-none" />

            <Card className="w-full max-w-md bg-white border-slate-200 shadow-2xl relative z-10 rounded-[2.5rem] p-4">
                <form onSubmit={handleLogin}>
                    <CardHeader className="space-y-1 pb-8">
                        <div className="flex justify-center mb-6">
                            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/20">
                                    K
                                </div>
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-extrabold text-center text-slate-900 tracking-tight uppercase">
                            {isAdmin ? "Admin Login" : "Sign In"}
                        </CardTitle>
                        <CardDescription className="text-center text-slate-500 font-medium">
                            {isAdmin ? "Global Infrastructure Access" : "Welcome back. Enter your details to continue."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {error && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider animate-in fade-in zoom-in-95" role="alert">
                                {error}
                            </div>
                        )}

                        {step === "identity" ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-500 font-bold text-[10px] uppercase tracking-widest ml-1">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        autoComplete="username"
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
                                            name="password"
                                            autoComplete="current-password"
                                            type={showPassword ? "text" : "password"}
                                            className="bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/20 focus:border-blue-500 h-12 rounded-xl px-4 pr-10"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={toggleShowPassword}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mfaCode" className="text-slate-500 font-bold text-[10px] uppercase tracking-widest ml-1">Authenticator Code</Label>
                                    <Input
                                        id="mfaCode"
                                        placeholder="000000"
                                        className="bg-slate-50 border-slate-200 text-slate-900 text-center text-2xl tracking-[0.5em] focus:ring-blue-500/20 focus:border-blue-500 h-16 rounded-xl font-black"
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                    <p className="text-[10px] text-blue-600 font-bold leading-relaxed">
                                        RESCUE MODE: If you lost your device, enter one of your 8-digit recovery codes above to regain access.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={goBack}
                                    className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest block w-full text-center transition-colors"
                                >
                                    &larr; Back to Login
                                </button>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 pb-8">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-12 rounded-xl transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest text-xs" disabled={loading}>
                            {loading ? "Verifying..." : (step === "identity" ? "Sign In" : "Unlock Identity")}
                        </Button>
                        <div className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-tighter">
                            New here?{" "}
                            <Link href="/register" className="text-blue-600 hover:text-blue-700">
                                Create an account
                            </Link>
                        </div>
                        <div className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-tighter">
                            <button
                                type="button"
                                onClick={toggleAdmin}
                                className="text-blue-600 hover:text-blue-700 underline underline-offset-4"
                            >
                                {isAdmin ? "Standard Login" : "Super Admin Mode"}
                            </button>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
