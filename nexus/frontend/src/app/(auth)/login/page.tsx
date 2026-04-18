"use client";

import { useState, useCallback, useEffect } from "react";
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
import Link from "next/link";
import { api } from "../../../lib/api";
import { Eye, EyeOff, HardDrive, Loader2 } from "lucide-react";
import {
  createDesktopOfflineSession,
  isDesktopShell,
} from "../../../lib/desktop-offline";

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
  isAdminFlow?: boolean;
  tenants?: Array<{ id: string; name: string }>;
}

interface NexusDesktop {
  auth: {
    login: (credentials: Record<string, unknown>) => Promise<{
      error?: boolean;
      message?: string;
      data: {
        user: AuthUser;
        accessToken: string;
      };
    }>;
  };
  sync: {
    bootstrap: () => Promise<{ error?: string; pulledCount: number }>;
  };
  session: {
    set: (data: Record<string, unknown>) => Promise<void>;
  };
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [step, setStep] = useState<"identity" | "mfa">("identity");
  const [isAdmin, setIsAdmin] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [isDesktopApp, setIsDesktopApp] = useState(false);
  const [offlineOpening, setOfflineOpening] = useState(false);

  const handleOfflineOpen = useCallback(async () => {
    setOfflineOpening(true);
    setError("");
    try {
      await createDesktopOfflineSession({
        email: email.trim() || "owner@local.erp",
      });
      window.location.href = "/portal/dashboard";
    } catch (offlineError) {
      console.error(offlineError);
      setError("Offline workspace could not be opened on this device.");
    } finally {
      setOfflineOpening(false);
    }
  }, [email]);

  useEffect(() => {
    const isShell = isDesktopShell();
    setIsDesktopApp(isShell);
  }, []); // Run once on mount. isDesktopShell() is environment-only, no deps needed.

  const completeLogin = useCallback((data: AuthResponse) => {
    localStorage.setItem("k_user", JSON.stringify(data.user));
    if (data.accessToken) {
      localStorage.setItem("k_token", data.accessToken);
    }

    const SAFE_FALLBACK = "/portal/dashboard";
    const returnTo = localStorage.getItem("return_to");
    localStorage.removeItem("return_to");

    if (data.user?.isSuperAdmin) {
      window.location.href = "/portal/admin/monitoring";
      return;
    }

    const safeRedirect = (raw: string | null): string => {
      if (!raw) return SAFE_FALLBACK;
      if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw)) return SAFE_FALLBACK;
      if (raw.startsWith("//")) return SAFE_FALLBACK;
      if (!raw.startsWith("/portal")) return SAFE_FALLBACK;
      try {
        const parsed = new URL(raw, window.location.origin);
        if (parsed.origin !== window.location.origin) return SAFE_FALLBACK;
        return parsed.pathname + parsed.search + parsed.hash;
      } catch {
        return SAFE_FALLBACK;
      }
    };

    window.location.href = safeRedirect(returnTo);
  }, []);

  const handleLogin = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLoading(true);
      setError("");

      try {
        if (step === "identity") {
          const finalEmail = email.trim();
          const finalPassword = password.trim();

          if (!finalEmail || !finalPassword) {
            setError("Credentials required.");
            setLoading(false);
            return;
          }

          const endpoint = isAdmin ? "auth/login/admin" : "auth/login/web";

          if (isDesktopApp) {
            try {
              const nexusDesktop = (
                window as unknown as { nexusDesktop: NexusDesktop }
              ).nexusDesktop;
              const desktopRes = await nexusDesktop.auth.login({
                email: finalEmail,
                password: finalPassword,
                isAdmin: isAdmin,
              });

              if (desktopRes.error) {
                setError(desktopRes.message || "Desktop authentication failed");
                setLoading(false);
                return;
              }

              localStorage.setItem(
                "k_user",
                JSON.stringify(desktopRes.data.user),
              );
              localStorage.setItem("k_token", desktopRes.data.accessToken);
              localStorage.setItem("k_cloud_sync_active", "true");

              try {
                await nexusDesktop.session.set(desktopRes.data);
                // Removed auto-sync to strictly adhere to the manual "User-Initiated Only" policy.
                window.location.href = "/portal/dashboard";
              } catch (syncErr: unknown) {
                const err = syncErr as { message?: string };
                console.error("[DESKTOP_SYNC_FAIL]", err);
                window.location.href = "/portal/dashboard";
              }
              return;
            } catch (err: unknown) {
              const error = err as { message?: string };
              setError(
                "Bridge Communication Error: " +
                  (error.message || "Unknown error"),
              );
              setLoading(false);
              return;
            }
          }

          const res = await api.post(endpoint, {
            email: finalEmail,
            password: finalPassword,
          });

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
            totpCode: mfaCode,
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
        }
      } finally {
        setLoading(false);
      }
    },
    [
      step,
      email,
      password,
      isAdmin,
      tempToken,
      mfaCode,
      completeLogin,
      isDesktopApp,
    ],
  );

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const idToken = "sim-google-token";
      const endpoint = isAdmin
        ? "auth/google-login/admin"
        : "auth/google-login/web";
      const res = await api.post(endpoint, { idToken });

      if (res.data.requiresMfa || res.data.requiresMfaSetup) {
        if (res.data.requiresMfaSetup) {
          setError("MFA setup required. Please login with password first.");
          setLoading(false);
          return;
        }
        setTempToken(res.data.tempToken);
        setStep("mfa");
        setLoading(false);
        return;
      }

      completeLogin(res.data as AuthResponse);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || "Google Authentication Failed");
      setLoading(false);
    }
  }, [isAdmin, completeLogin]);

  const goBack = useCallback(() => {
    setStep("identity");
    setMfaCode("");
    setError("");
  }, []);

  const toggleAdmin = useCallback(() => {
    setIsAdmin((prev) => !prev);
  }, []);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
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
              {isAdmin
                ? "Global Infrastructure Access"
                : isDesktopApp
                  ? "Open your local workspace offline, or use cloud sign-in only when you need sync."
                  : "Welcome back. Enter your details to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div
                className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider animate-in fade-in zoom-in-95"
                role="alert"
              >
                {error}
              </div>
            )}

            {step === "identity" ? (
              <>
                {isDesktopApp && !isAdmin && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-white p-2 text-blue-600 shadow-sm">
                        <HardDrive size={16} />
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-blue-700">
                            Desktop Offline Mode
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            This device can run locally without the website.
                            Cloud login is only needed later for sync and team
                            workspace sharing.
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={handleOfflineOpen}
                          disabled={offlineOpening || loading}
                          className="bg-slate-900 hover:bg-slate-950 text-white font-black h-11 rounded-xl uppercase tracking-widest text-xs"
                        >
                          {offlineOpening
                            ? "Opening Workspace..."
                            : "Continue Offline On This Device"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-slate-500 font-bold text-[10px] uppercase tracking-widest ml-1"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="username"
                    placeholder="name@company.com"
                    className="bg-slate-50 border-slate-200 text-slate-900 h-12 rounded-xl font-medium px-4"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label
                      htmlFor="password"
                      className="text-slate-500 font-bold text-[10px] uppercase tracking-widest"
                    >
                      Password
                    </Label>
                    {!isDesktopApp && (
                      <Link
                        href="/forgot-password"
                        className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-tighter"
                      >
                        Recovery?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      autoComplete="current-password"
                      type={showPassword ? "text" : "password"}
                      className="bg-slate-50 border-slate-200 text-slate-900 h-12 rounded-xl px-4 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={toggleShowPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="mfaCode"
                    className="text-slate-500 font-bold text-[10px] uppercase tracking-widest ml-1"
                  >
                    Authenticator Code
                  </Label>
                  <Input
                    id="mfaCode"
                    className="bg-slate-50 border-slate-200 text-slate-900 text-center text-2xl tracking-[0.5em] h-16 rounded-xl font-black"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <Button
                  type="button"
                  onClick={goBack}
                  variant="ghost"
                  className="w-full text-[10px] font-black text-slate-400 underline h-auto p-0"
                >
                  Back to Login
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-8">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-12 rounded-xl uppercase tracking-widest text-xs"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : step === "identity" ? (
                isDesktopApp ? (
                  "Cloud Sign In"
                ) : (
                  "Sign In"
                )
              ) : (
                "Unlock Identity"
              )}
            </Button>
            <Button
              type="button"
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full h-12 rounded-xl font-bold border-slate-200"
            >
              Sign in with Google
            </Button>
            {!isDesktopApp && (
              <div className="text-[10px] text-center text-slate-400 font-bold uppercase">
                New here?{" "}
                <Link href="/register" className="text-blue-600">
                  Create an account
                </Link>
              </div>
            )}
            <button
              type="button"
              onClick={toggleAdmin}
              className="text-[10px] text-blue-600 font-bold uppercase underline underline-offset-4"
            >
              {isAdmin ? "Standard Login" : "Super Admin Mode"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
