"use client";

import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { jwtDecode } from "jwt-decode";
import { resolvePortalPath } from "../../../lib/utils";


interface DecodedToken {
  tenantId?: string;
  type?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDesktopApp, setIsDesktopApp] = useState(false);

  useEffect(() => {
    setIsDesktopApp(typeof window !== "undefined" && !!window.nexusDesktop);
  }, []);

  const [business, setBusiness] = useState({
    name: "",
    type: "Retail",
    currency: "USD",
    timezone: "UTC",
    country: "",
    state: "",
    gst: "",
  });

  const [owner, setOwner] = useState({
    fullName: "",
    email: "",
    password: "",
    mobile: "",
  });

  const handleNext = () => {
    if (!business.name || !business.country) {
      setError("Business Name and Country are required.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isDesktopApp) {
        if (!owner.fullName || !owner.email || !owner.password) {
          setError("Owner details are required.");
          setLoading(false);
          return;
        }

        const desktop = (window as any).nexusDesktop;
        const result = await desktop.auth.localOnboarding({
          business,
          owner,
        });

        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }

        // Onboarding success, we need to log them in automatically
        const loginResult = await desktop.auth.login?.({
          email: owner.email,
          password: owner.password,
        });

        if (loginResult?.data?.accessToken) {
          localStorage.setItem("k_token", loginResult.data.accessToken);
          localStorage.setItem("k_user", JSON.stringify(loginResult.data.user));
          router.push("/portal/modules-setup");
        } else {
          router.push("/portal/login");
        }
      } else {
        // Web Browser Onboarding Flow
        if (!business.name || !business.country) {
          setError("Business Name and Country are required.");
          setLoading(false);
          return;
        }

        const token = localStorage.getItem("k_token");
        if (!token) {
          router.push("/portal/login");
          return;
        }

        let tenantId = "";
        try {
          const decoded = jwtDecode<DecodedToken>(token);
          tenantId = decoded.tenantId || "";
        } catch {
          // Token invalid, go to login
          router.push("/portal/login");
          return;
        }

        // 1. Create workspace if we don't have a scoped tenant token yet
        if (!tenantId) {
          const createRes = await api.post("auth/create-workspace", {
            name: business.name,
            type: business.type,
          });
          tenantId = createRes.data.id;
        }

        // 2. Complete onboarding for the tenant
        await api.post("auth/onboarding", {
          tenantId,
          industry: business.type,
          businessType: business.type,
          gstin: business.gst || undefined,
        });

        // 3. Select the newly onboarded tenant to get a tenant-scoped token
        const selectRes = await api.post("auth/select-tenant", {
          tenantId,
        });

        if (selectRes.data.accessToken) {
          localStorage.setItem("k_token", selectRes.data.accessToken);
        }
        if (selectRes.data.tenant) {
          localStorage.setItem("k_tenant", JSON.stringify(selectRes.data.tenant));
        }

        // Redirect to modules setup or dashboard
        // basePath is /portal, so /dashboard becomes /portal/dashboard
        window.location.href = resolvePortalPath("/dashboard");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Onboarding failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-0 rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-900 text-white p-8">
          <CardTitle className="text-2xl font-black tracking-tight">
            Welcome to Klypso ERP
          </CardTitle>
          <CardDescription className="text-slate-400 mt-2">
            Let's set up your local workspace.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl border border-rose-100">
                {error}
              </div>
            )}

            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={business.name}
                    onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                    placeholder="Acme Corp"
                    className="h-12 rounded-xl"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Type</Label>
                    <Input
                      value={business.type}
                      onChange={(e) => setBusiness({ ...business, type: e.target.value })}
                      placeholder="Retail / Manufacturing"
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input
                      value={business.currency}
                      onChange={(e) => setBusiness({ ...business, currency: e.target.value })}
                      placeholder="USD / INR"
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={business.country}
                      onChange={(e) => setBusiness({ ...business, country: e.target.value })}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={business.state}
                      onChange={(e) => setBusiness({ ...business, state: e.target.value })}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>GST / VAT (Optional)</Label>
                  <Input
                    value={business.gst}
                    onChange={(e) => setBusiness({ ...business, gst: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Full Name</Label>
                  <Input
                    value={owner.fullName}
                    onChange={(e) => setOwner({ ...owner, fullName: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={owner.email}
                    onChange={(e) => setOwner({ ...owner, email: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={owner.password}
                    onChange={(e) => setOwner({ ...owner, password: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <Input
                    type="tel"
                    value={owner.mobile}
                    onChange={(e) => setOwner({ ...owner, mobile: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50 p-8 border-t border-slate-100 flex justify-end gap-4">
            {step === 2 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="h-12 px-6 rounded-xl font-bold"
                disabled={loading}
              >
                Back
              </Button>
            )}
            
            {step === 1 ? (
              <Button
                type={isDesktopApp ? "button" : "submit"}
                onClick={isDesktopApp ? handleNext : undefined}
                className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-xs"
                disabled={loading}
              >
                {loading && !isDesktopApp ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                {isDesktopApp ? "Next Step" : "Complete Setup"}
              </Button>
            ) : (
              <Button
                type="submit"
                className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-xs"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                Complete Setup
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
