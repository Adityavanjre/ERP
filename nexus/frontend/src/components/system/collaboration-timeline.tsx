'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Trash2, Reply, X, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
    id: string;
    userId: string;
    content: string;
    createdAt: string;
    parentId?: string;
    replies?: Comment[];
}

interface CollaborationTimelineProps {
    resourceType: string;
    resourceId: string;
}

export function CollaborationTimeline({ resourceType, resourceId }: CollaborationTimelineProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [replyTo, setReplyTo] = useState<Comment | null>(null);

    const syncCommunicationFlux = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const { data } = await api.get(`/system/collaboration/comments/${resourceType}/${resourceId}`);
            setComments(data);
        } catch (err) {
            console.error("Communication Flux Sync Failure:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        syncCommunicationFlux(true);
        const interval = setInterval(() => syncCommunicationFlux(false), 30000);
        return () => clearInterval(interval);
    }, [resourceType, resourceId]);

    const addComment = async () => {
        if (!newComment.trim()) return;
        try {
            await api.post('system/collaboration/comments', {
                resourceType,
                resourceId,
                content: newComment,
                parentId: replyTo?.id,
            });
            setNewComment('');
            setReplyTo(null);
            syncCommunicationFlux(true);
            toast.success('Comment posted');
        } catch (err) {
            toast.error('Failed to post comment');
        }
    };

    const renderComment = (comment: Comment, isReply = false) => (
        <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${isReply ? 'ml-8 mt-2' : 'mt-4'}`}
        >
            <div className="flex gap-3 p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {comment.userId.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">User {comment.userId.substring(0, 4)}</span>
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                    </div>
                    <p className="text-sm mt-1 text-foreground/80">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-2">
                        {!isReply && (
                            <button
                                onClick={() => setReplyTo(comment)}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                                <Reply className="w-3 h-3" /> Reply
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {comment.replies && comment.replies.map(reply => renderComment(reply, true))}
        </motion.div>
    );

    return (
        <Card className="p-4 bg-background/50 backdrop-blur-sm border-primary/20 shadow-xl lg:sticky lg:top-24">
            <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Comments & Discussion</h3>
            </div>

            <div className="max-h-[500px] overflow-y-auto mb-4 space-y-2 pr-2 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground animate-pulse">Loading discussion...</div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground italic border-2 border-dashed border-secondary/30 rounded-lg">
                        No discussion yet. Start the conversation!
                    </div>
                ) : (
                    comments.map(comment => !comment.parentId && renderComment(comment))
                )}
            </div>

            <div className="space-y-2">
                <AnimatePresence>
                    {replyTo && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-primary/10 p-2 rounded flex items-center justify-between text-xs"
                        >
                            <span className="truncate">Replying to: {replyTo.content.substring(0, 30)}...</span>
                            <button onClick={() => setReplyTo(null)}><X className="w-3 h-3" /></button>
                        </motion.div>
                    )}
                </AnimatePresence>
                <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] bg-secondary/10 border-primary/10 focus:border-primary/40 transition-all text-sm"
                />
                <div className="flex justify-end gap-2">
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            const formData = new FormData();
                            formData.append('file', file);

                            const toastId = toast.loading("Uploading...");

                            try {
                                const { data } = await api.post('/system/collaboration/upload', formData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                });

                                const linkText = file.type.startsWith('image/') ? `\n![${file.name}](${data.url})` : `\n[Download ${file.name}](${data.url})`;
                                setNewComment(prev => prev + linkText);
                                toast.success("File attached", { id: toastId });
                            } catch (err) {
                                console.error(err);
                                toast.error("Upload failed", { id: toastId });
                            } finally {
                                // Reset the input so the same file can be selected again if needed
                                e.target.value = '';
                            }
                        }}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 border-primary/10"
                        onClick={() => document.getElementById('file-upload')?.click()}
                        disabled={loading}
                    >
                        <Paperclip className="w-3 h-3" /> Attach
                    </Button>
                    <Button onClick={addComment} size="sm" className="gap-1 shadow-lg shadow-primary/20">
                        <Send className="w-3 h-3" /> Post
                    </Button>
                </div>
            </div>
        </Card>
    );
}
