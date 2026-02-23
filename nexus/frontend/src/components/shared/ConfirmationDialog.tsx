import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'warning',
}) => {
    const variantStyles = {
        danger: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20',
        warning: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20',
        info: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20',
    };

    const iconStyles = {
        danger: 'text-rose-600 bg-rose-50',
        warning: 'text-amber-600 bg-amber-50',
        info: 'text-blue-600 bg-blue-50',
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[420px] rounded-[32px] p-8">
                <DialogHeader className="flex flex-col items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${iconStyles[variant]}`}>
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-center uppercase tracking-tight">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-center text-slate-500 font-medium text-lg leading-relaxed">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 h-14 rounded-2xl text-lg font-bold border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-wider"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 h-14 rounded-2xl text-lg font-black text-white transition-all uppercase tracking-widest shadow-lg active:scale-95 ${variantStyles[variant]}`}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
