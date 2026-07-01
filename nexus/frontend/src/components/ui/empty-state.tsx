"use client";

import { Button } from "../../components/ui/button";
import { LucideIcon, Plus } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center">
      <div className="p-3 bg-white/5 rounded-full mb-4">
        <Icon className="h-8 w-8 text-zinc-500" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm max-w-xs mb-3">{description}</p>
      {actionText && onAction && (
        <Button
          onClick={onAction}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl px-4"
        >
          <Plus className="mr-2 h-4 w-4" /> {actionText}
        </Button>
      )}
    </div>
  );
}
