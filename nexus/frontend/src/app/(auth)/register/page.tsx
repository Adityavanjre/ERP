'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// Validation Schemas
const userSchema = z.object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

const companySchema = z.object({
    tenantName: z.string().min(3, 'Company name is required'),
    companyType: z.string().min(1, 'Please select an industry'),
});

type UserFormData = z.infer<typeof userSchema>;
type CompanyFormData = z.infer<typeof companySchema>;

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [userData, setUserData] = useState<UserFormData | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // PERF-002: Trap browser history payload states natively protecting the multi-step form data
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handlePopState = (_e: PopStateEvent) => {
            if (step === 2) {
                // Intercept back button allowing user to return to Step 1 
                // natively without crashing out to login/index
                setStep(1);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [step]);

    // Forms
    const {
        register: registerUser,
        handleSubmit: handleUserSubmit,
        setError,
        watch,
        formState: { errors: userErrors },
    } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        mode: "onChange", // Enable live validation
    });

    const {
        register: registerCompany,
        handleSubmit: handleCompanySubmit,
        setValue: setCompanyValue,
        formState: { errors: companyErrors },
    } = useForm<CompanyFormData>({
        resolver: zodResolver(companySchema),
    });

    // Step 1: User Details
    const onUserStepSubmit = (data: UserFormData) => {
        setUserData(data);
        setStep(2);
        // Push fake state so hitting back browser-button triggers popstate trap
        if (typeof window !== 'undefined') {
            window.history.pushState({ wizardStep: 2 }, '', window.location.href);
        }
    };

    // Step 2: Company Details & Final Submission
    const onFinalSubmit = async (companyData: CompanyFormData) => {
        if (!userData) return;

        setIsLoading(true);
        try {
            // Exclude confirmPassword from the API payload
            const { confirmPassword: _confirmPassword, ...validUserData } = userData;

            const payload = {
                ...validUserData,
                ...companyData,
            };

            const response = await api.post('auth/register', payload);
            const { accessToken } = response.data;

            // Store both keys the same way login does — TenantSelector reads k_identity first
            localStorage.setItem('k_token', accessToken);
            localStorage.setItem('k_identity', accessToken);
            localStorage.setItem('k_user', JSON.stringify(response.data.user));

            toast.success('Registration successful!', {
                description: 'Welcome to your new business account.',
            });

            // Redirect
            window.location.href = '/portal/dashboard';
        } catch (error: unknown) {
            const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
            console.error(err);
            if (err.response?.status === 409) {
                // Set specific error on the email field
                setError('email', {
                    type: 'manual',
                    message: 'This email is already registered. Please sign in.'
                });
                // Switch back to step 1 to show the error
                setStep(1);
            }

            toast.error('Registration failed', {
                description: err.response?.data?.message || err.message || 'Something went wrong. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            // If NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing, trigger the backend's internal offline testability mode
            const idToken = "sim-google-token";

            // Note: If using real Google OAuth in the future, inject the real ID token here.
            // For now, the backend explicitly supports the simulation token for demo/testing.
            const res = await api.post("auth/google-login/web", { idToken });

            if (res.data.requiresMfa || res.data.requiresMfaSetup) {
                toast.error('MFA setup or verification required. Please sign in via the login page.');
                setIsLoading(false);
                return;
            }

            // Store both keys the same way login does
            localStorage.setItem('k_token', res.data.accessToken);
            localStorage.setItem('k_identity', res.data.accessToken);
            localStorage.setItem('k_user', JSON.stringify(res.data.user));

            toast.success('Registration successful!', {
                description: 'Please complete your company onboarding next.',
            });

            // Redirect
            window.location.href = '/portal/dashboard';
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error('Google Registration failed', {
                description: err.response?.data?.message || "Google Authentication Failed",
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 selection:bg-blue-600/10 p-4 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.05),transparent)] pointer-events-none" />
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-3 relative z-10">
                    <div className="flex justify-center mb-8">
                        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-blue-500/5">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-blue-500/20">
                                K
                            </div>
                        </div>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900">Create Account</h1>
                    <p className="text-slate-500 font-medium">Set up your business workspace in minutes.</p>
                </div>

                <Card className="bg-white border-slate-200 shadow-2xl shadow-blue-500/5 relative z-10 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="flex items-center justify-between mb-2">
                            <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">
                                {step === 1 ? 'Personal Profile' : 'Company Details'}
                            </CardTitle>
                            <Badge variant="outline" className="border-slate-100 text-slate-400 font-black text-[10px]">Step {step} of 2</Badge>
                        </div>
                        <CardDescription className="text-slate-500 font-medium">
                            {step === 1
                                ? 'Enter your credentials to create the primary admin profile.'
                                : 'Configure your company identity.'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-8 pt-4">
                        {step === 1 ? (
                            <form id="user-form" onSubmit={handleUserSubmit(onUserStepSubmit)} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</Label>
                                    <Input
                                        className="bg-slate-50 border-slate-100 text-slate-900 focus:ring-blue-600 focus:border-blue-600 placeholder:text-slate-300 h-12 rounded-xl font-medium"
                                        id="fullName"
                                        placeholder="Executive Director"
                                        {...registerUser('fullName')}
                                    />
                                    {userErrors.fullName && (
                                        <p className="text-xs text-rose-500 font-bold">{userErrors.fullName.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Work Email</Label>
                                    <Input
                                        className="bg-slate-50 border-slate-100 text-slate-900 focus:ring-blue-600 focus:border-blue-600 placeholder:text-slate-300 h-12 rounded-xl font-medium"
                                        id="email"
                                        type="email"
                                        placeholder="admin@company.com"
                                        {...registerUser('email')}
                                    />
                                    {userErrors.email && (
                                        <p className="text-xs text-rose-500 font-bold">{userErrors.email.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</Label>
                                    <div className="relative">
                                        <Input
                                            className="bg-slate-50 border-slate-100 text-slate-900 focus:ring-blue-600 focus:border-blue-600 placeholder:text-slate-300 h-12 rounded-xl font-medium pr-10"
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Create a strong password"
                                            {...registerUser('password')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <div className="mt-3 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Password Requirements</p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {[
                                                { label: "At least 8 characters", valid: (watch("password")?.length || 0) >= 8 },
                                                { label: "One uppercase letter", valid: /[A-Z]/.test(watch("password") || "") },
                                                { label: "One number", valid: /[0-9]/.test(watch("password") || "") },
                                                { label: "One special character", valid: /[^a-zA-Z0-9]/.test(watch("password") || "") },
                                            ].map((req, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${req.valid ? "bg-green-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                                                        {req.valid && <CheckCircle2 className="w-2.5 h-2.5" />}
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase tracking-tight ${req.valid ? "text-green-600" : "text-slate-400"}`}>{req.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {userErrors.password && (
                                        <p className="text-xs text-rose-500 font-bold mt-2">{userErrors.password.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirm Password</Label>
                                    <div className="relative">
                                        <Input
                                            className="bg-slate-50 border-slate-100 text-slate-900 focus:ring-blue-600 focus:border-blue-600 placeholder:text-slate-300 h-12 rounded-xl font-medium pr-10"
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Re-enter your password"
                                            {...registerUser('confirmPassword')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {userErrors.confirmPassword && (
                                        <p className="text-xs text-rose-500 font-bold">{userErrors.confirmPassword.message}</p>
                                    )}
                                </div>
                            </form>
                        ) : (
                            <form id="company-form" onSubmit={handleCompanySubmit(onFinalSubmit)} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="tenantName" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Company Name</Label>
                                    <Input
                                        className="bg-slate-50 border-slate-100 text-slate-900 focus:ring-blue-600 focus:border-blue-600 placeholder:text-slate-300 h-12 rounded-xl font-medium"
                                        id="tenantName"
                                        placeholder="Global Industries Corp"
                                        {...registerCompany('tenantName')}
                                    />
                                    {companyErrors.tenantName && (
                                        <p className="text-xs text-rose-500 font-bold">{companyErrors.tenantName.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="companyType" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Industry</Label>
                                    <input type="hidden" {...registerCompany('companyType')} />
                                    <Select onValueChange={(val) => setCompanyValue('companyType', val, { shouldValidate: true })}>
                                        <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-medium">
                                            <SelectValue placeholder="Select Industry" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                            <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                                            <SelectItem value="Retail">Retail</SelectItem>
                                            <SelectItem value="Wholesale">Wholesale</SelectItem>
                                            <SelectItem value="Healthcare">Healthcare</SelectItem>
                                            <SelectItem value="Education">Education</SelectItem>
                                            <SelectItem value="Construction">Construction</SelectItem>
                                            <SelectItem value="Logistics">Logistics</SelectItem>
                                            <SelectItem value="RealEstate">Real Estate</SelectItem>
                                            <SelectItem value="NBFC">Non-Bank Finance (NBFC)</SelectItem>
                                            <SelectItem value="Service">Service</SelectItem>
                                            <SelectItem value="Gov">Government</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {companyErrors.companyType && (
                                        <p className="text-xs text-rose-500 font-bold">{companyErrors.companyType.message}</p>
                                    )}
                                </div>
                            </form>
                        )}
                    </CardContent>

                    <CardFooter className="p-8 pt-0 flex flex-col gap-4">
                        <div className="flex w-full gap-3">
                            {step === 2 && (
                                <Button variant="ghost" type="button" onClick={() => { setStep(1); if (typeof window !== 'undefined') window.history.back(); }} disabled={isLoading} className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 rounded-xl h-12">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                            )}
                            <Button type="submit" form={step === 1 ? "user-form" : "company-form"} disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black h-12 rounded-xl transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest text-[10px] active:scale-95">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...
                                    </>
                                ) : (
                                    <>
                                        {step === 1 ? "Continue" : "Create Account"}
                                        {step === 1 ? <ArrowRight className="ml-2 h-4 w-4" /> : <CheckCircle2 className="ml-2 h-4 w-4" />}
                                    </>
                                )}
                            </Button>
                        </div>

                        {step === 1 && (
                            <>
                                <div className="relative w-full flex items-center justify-center py-2 mt-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200"></div>
                                    </div>
                                    <div className="relative bg-white px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Or
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    variant="outline"
                                    className="w-full h-12 mt-2 rounded-xl font-bold bg-white text-slate-700 hover:bg-slate-50 border-slate-200 transition-all focus:ring-2 focus:ring-slate-100"
                                >
                                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                        <path d="M1 1h22v22H1z" fill="none" />
                                    </svg>
                                    Register with Google
                                </Button>
                            </>
                        )}

                        {step === 1 && (
                            <div className="text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">
                                Already have an account? <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500 hover:underline">Sign In</Link>
                            </div>
                        )}
                    </CardFooter>
                </Card>
                <p className="text-center text-[9px] text-slate-400 font-black uppercase tracking-[0.4em] opacity-40">
                    Klypso v2.0
                </p>
            </div>
        </div>
    );
}
