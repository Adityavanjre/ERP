'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Must contain at least one number')
        .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
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
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [userData, setUserData] = useState<UserFormData | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    };

    // Step 2: Company Details & Final Submission
    const onFinalSubmit = async (companyData: CompanyFormData) => {
        if (!userData) return;

        setIsLoading(true);
        try {
            // Exclude confirmPassword from the API payload
            const { confirmPassword, ...validUserData } = userData;

            const payload = {
                ...validUserData,
                ...companyData,
            };

            const response = await api.post('auth/register', payload);
            const { accessToken } = response.data;

            // Login
            localStorage.setItem('nx_token', accessToken);

            toast.success('Registration successful!', {
                description: 'Welcome to your new business account.',
            });

            // Redirect
            router.push('/dashboard');
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 409) {
                // Set specific error on the email field
                setError('email', {
                    type: 'manual',
                    message: 'This email is already registered. Please sign in.'
                });
                // Switch back to step 1 to show the error
                setStep(1);
            }

            toast.error('Registration failed', {
                description: error.response?.data?.message || 'Something went wrong. Please try again.',
            });
        } finally {
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
                                Z
                            </div>
                        </div>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900">Initialize Nexus Node</h1>
                    <p className="text-slate-500 font-medium">Deploy your Zenith ecosystem workspace.</p>
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
                                                { label: "At least 8 characters", valid: (registerUser("password").onChange as any)?.target?.value?.length >= 8 || watch("password")?.length >= 8 },
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
                                    <Label htmlFor="companyType" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Industry Vertical</Label>
                                    <Select onValueChange={(val) => setCompanyValue('companyType', val)}>
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
                                <Button variant="ghost" onClick={() => setStep(1)} disabled={isLoading} className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 rounded-xl h-12">
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
                            <div className="text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                                Already networked? <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500 hover:underline">Nexus Authorization</Link>
                            </div>
                        )}
                    </CardFooter>
                </Card>
                <p className="text-center text-[9px] text-slate-400 font-black uppercase tracking-[0.4em] opacity-40">
                    Zenith Intelligence v2.0
                </p>
            </div>
        </div>
    );
}
