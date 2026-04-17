"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isDesktopShell } from "../../lib/desktop-offline";

interface DesktopRouteGateProps {
    redirectPath?: string;
}

/**
 * Route Gate for Desktop Shell
 * 
 * If running in the Electron desktop shell, this component will immediately
 * trigger a redirect to the specified path (default: /login).
 * Use this to hide marketing or web-only pages from desktop users.
 */
export function DesktopRouteGate({ redirectPath = "/login" }: DesktopRouteGateProps) {
    const router = useRouter();

    useEffect(() => {
        if (isDesktopShell()) {
            router.replace(redirectPath);
        }
    }, [router, redirectPath]);

    return null;
}
