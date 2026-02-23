"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

const onboardingSchema = z.object({
    industry: z.string().min(1, "Please select an industry"),
    businessType: z.string().min(1, "Please select a business type"),
    gstin: z.string().min(15, "Invalid GSTIN format").max(15, "Invalid GSTIN format").optional().or(z.literal("")),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<OnboardingFormData>({
        resolver: zodResolver(onboardingSchema),
    });

    const onSubmit = async (data: OnboardingFormData) => {
        if (!user?.tenantId) return;

        setIsLoading(true);
        try {
            await api.post("auth/onboarding", {
                ...data,
                tenantId: user.tenantId,
            });

            toast.success("Onboarding complete!", {
                description: "Your workspace is ready. Please log in again to refresh your session.",
            });

            // Redirect to login to get a fresh token with isOnboarded: true
            // In a more advanced setup, we would refresh the token silently.
            localStorage.removeItem("k_token");
            router.push("/login");
        } catch (error: any) {
            toast.error("Onboarding failed", {
                description: error.response?.data?.message || "Something went wrong.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-lg rounded-[2.5rem] shadow-2xl shadow-blue-500/5 border-slate-200">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Finalize Setup</CardTitle>
                    <CardDescription className="text-slate-500 font-medium font-medium">Complete your company profile to activate your workspace.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                    <form id="onboarding-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Industry</Label>
                            <Select onValueChange={(val) => setValue("industry", val)}>
                                <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-medium">
                                    <SelectValue placeholder="Select Industry" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                    <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                                    <SelectItem value="Retail">Retail</SelectItem>
                                    <SelectItem value="Wholesale">Wholesale</SelectItem>
                                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                                    <SelectItem value="Logistics">Logistics</SelectItem>
                                    <SelectItem value="Service">Service</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.industry && <p className="text-xs text-rose-500 font-bold">{errors.industry.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Business Type</Label>
                            <Select onValueChange={(val) => setValue("businessType", val)}>
                                <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-medium">
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                    <SelectItem value="Proprietorship">Proprietorship</SelectItem>
                                    <SelectItem value="Partnership">Partnership</SelectItem>
                                    <SelectItem value="Pvt Ltd">Private Limited</SelectItem>
                                    <SelectItem value="LLP">LLP</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.businessType && <p className="text-xs text-rose-500 font-bold">{errors.businessType.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">GSTIN (Optional)</Label>
                            <Input
                                className="bg-slate-50 border-slate-100 text-slate-900 h-12 rounded-xl font-medium"
                                placeholder="27AAAAA0000A1Z5"
                                {...register("gstin")}
                            />
                            {errors.gstin && <p className="text-xs text-rose-500 font-bold">{errors.gstin.message}</p>}
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="p-8 pt-0">
                    <Button
                        type="submit"
                        form="onboarding-form"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-12 rounded-xl transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest text-[10px]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing...
                            </>
                        ) : (
                            <>
                                Complete Setup <CheckCircle2 className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
