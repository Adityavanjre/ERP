
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: number;
    text?: string;
}

export function LoadingSpinner({ className, size = 24, text, ...props }: LoadingSpinnerProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-3 text-muted-foreground", className)} {...props}>
            <Loader2 className="animate-spin text-primary" size={size} />
            {text && <p className="text-sm font-medium animate-pulse">{text}</p>}
        </div>
    );
}
