
"use client";

import { useParams } from "next/navigation";
import { DynamicView } from "@/components/kernel/dynamic-view";

export default function DynamicAppPage() {
    const params = useParams();
    const appName = params.name as string;

    // In a full implementation, we'd fetch which models belong to this app
    // For now, we assume the app has a main model of the same name or similar
    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <DynamicView
                appName={appName}
                modelName={appName}
            />
        </div>
    );
}
