
"use client";

import React, { useState, useRef, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ImportResults {
    total: number;
    imported: number;
    failed: number;
    errors: string[];
}

interface ApiError {
    response?: {
        data?: {
            errors?: string[];
            message?: string;
            error?: string;
        };
    };
}

interface BulkImportDialogProps {
    endpoint: string;
    title: string;
    description: string;
    onSuccess: () => void;
    children: React.ReactNode;
}

export function BulkImportDialog({
    endpoint,
    title,
    description,
    onSuccess,
    children,
}: BulkImportDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [importResults, setImportResults] = useState<ImportResults | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [csvContent, setCsvContent] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        if (selected.type !== "text/csv" && !selected.name.endsWith('.csv')) {
            toast.error("Please select a valid CSV file");
            return;
        }

        setFile(selected);
        setImportResults(null); // Clear previous results
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setCsvContent(text);
        };
        reader.readAsText(selected);
    }, []);

    const handleImport = useCallback(async () => {
        if (!csvContent) {
            toast.error("Please select a file to import");
            return;
        }

        try {
            setLoading(true);
            setImportResults(null);

            const response = await api.post(endpoint, { csv: csvContent });
            const results = response.data as ImportResults;

            if (results.errors && results.errors.length > 0) {
                setImportResults(results);
                toast.warning(`Imported ${results.imported} rows, but ${results.failed} rows failed.`);
            } else {
                toast.success("Import successful");
                setOpen(false);
                setFile(null);
                setCsvContent("");
                onSuccess();
            }
        } catch (err: unknown) {
            const error = err as ApiError;
            const errorData = error.response?.data;
            if (errorData?.errors && Array.isArray(errorData.errors)) {
                setImportResults(errorData as ImportResults);
                toast.error(`Import failed with ${errorData.errors.length} errors.`);
            } else {
                toast.error(errorData?.message || errorData?.error || "Failed to import data");
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [csvContent, endpoint, onSuccess]);

    const handleOpenChange = useCallback((val: boolean) => {
        setOpen(val);
        if (!val) {
            setFile(null);
            setCsvContent("");
        }
    }, []);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 flex flex-col items-center justify-center">
                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer hover:bg-slate-50 ${file ? "border-blue-500 bg-blue-50/30" : "border-slate-200"
                            }`}
                    >
                        {file ? (
                            <>
                                <FileSpreadsheet className="h-12 w-12 text-blue-500 mb-4" />
                                <p className="text-sm font-bold text-slate-900">{file.name}</p>
                                <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-4">Click to replace</p>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="h-12 w-12 text-slate-400 mb-4 group-hover:text-blue-500 transition-colors" />
                                <p className="text-sm font-bold text-slate-700">Click to browse or drag and drop</p>
                                <p className="text-xs text-slate-500 mt-1">CSV files only</p>
                            </>
                        )}
                    </div>

                    {importResults && (
                        <div className="w-full mt-4 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                            <div className="p-3 border-b border-slate-200 bg-slate-100/50 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-700">Import Summary</span>
                                <div className="flex gap-2">
                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                        {importResults.imported} OK
                                    </span>
                                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                                        {importResults.failed} Failed
                                    </span>
                                </div>
                            </div>
                            <div className="max-h-[150px] overflow-y-auto p-3">
                                {importResults.errors.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {importResults.errors.map((error, idx) => (
                                            <div key={idx} className="flex gap-2 text-[10px] items-start">
                                                <AlertCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                                                <span className="text-red-700 font-medium leading-tight">{error}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-slate-500 italic">No errors reported.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {!importResults && (
                        <div className="w-full mt-4 bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-900 font-medium">
                                Make sure your CSV headers exactly match the template format. Invalid rows will be skipped.
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!file || loading}
                        className="bg-blue-600 hover:bg-blue-700 font-bold"
                    >
                        {loading ? <LoadingSpinner text="Importing..." /> : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Start Import
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
