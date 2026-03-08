import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import api from '../../api';

interface ImageUploaderProps {
    onUploadSuccess: (url: string) => void;
    label?: string;
    existingImage?: string;
    folder?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
    onUploadSuccess,
    label = "Upload Image",
    existingImage,
}) => {
    const [preview, setPreview] = useState<string | null>(existingImage || null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [completed, setCompleted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size check (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("Image size must be less than 5MB");
            return;
        }

        setUploading(true);
        setError(null);
        setCompleted(false);

        const formData = new FormData();
        formData.append('image', file);

        try {
            const { data } = await api.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setPreview(data.url);
            onUploadSuccess(data.url);
            setCompleted(true);
        } catch (err: unknown) {
            console.error(err);
            const errorObj = err as any;
            setError(errorObj.response?.data?.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const clearImage = () => {
        setPreview(null);
        setCompleted(false);
        onUploadSuccess("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>

            <div className="relative group">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="hidden"
                    disabled={uploading}
                />

                {!preview ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            w-full h-48 border-2 border-dashed border-white/10 rounded-2xl 
                            flex flex-col items-center justify-center cursor-pointer 
                            transition-all hover:border-indigo-500/50 hover:bg-white/5
                            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {uploading ? (
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        ) : (
                            <>
                                <Upload className="w-8 h-8 text-gray-500 mb-2 group-hover:text-indigo-500 transition-colors" />
                                <span className="text-sm text-gray-500 font-medium">Click to select or drag image</span>
                                <span className="text-[10px] text-gray-600 mt-1 uppercase tracking-widest font-bold">Max 5MB</span>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 scale-110 group-hover:scale-100 duration-300">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/10"
                                title="Change Image"
                            >
                                <ImageIcon size={20} />
                            </button>
                            <button
                                type="button"
                                onClick={clearImage}
                                className="p-3 bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md rounded-full text-red-400 transition-all border border-red-500/20"
                                title="Remove Image"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {completed && !uploading && (
                            <div className="absolute top-4 right-4 bg-emerald-500 text-white p-1 rounded-full shadow-lg shadow-emerald-500/20 animate-in zoom-in">
                                <Check size={14} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {error && (
                <p className="text-xs text-red-500 font-medium mt-2 flex items-center gap-1">
                    <X size={12} /> {error}
                </p>
            )}
        </div>
    );
};

export default ImageUploader;
