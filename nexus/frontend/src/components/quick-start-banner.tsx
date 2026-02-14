"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, BookOpen, HelpCircle, Sparkles } from "lucide-react";
import { useState } from "react";

export function QuickStartBanner() {
    const [dismissed, setDismissed] = useState(false);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    const steps = [
        { id: 1, title: "Explore the Dashboard", description: "Click through all main tabs to get familiar" },
        { id: 2, title: "Create Your First Invoice", description: "Go to Finance → Issue Invoice" },
        { id: 3, title: "Record a Test Payment", description: "Mark an invoice as paid" },
        { id: 4, title: "Add Your Products", description: "Set up your actual inventory items" },
        { id: 5, title: "Invite Your Team", description: "Settings → User Management" },
    ];

    const toggleStep = (id: number) => {
        if (completedSteps.includes(id)) {
            setCompletedSteps(completedSteps.filter(s => s !== id));
        } else {
            setCompletedSteps([...completedSteps, id]);
        }
    };

    if (dismissed) return null;

    return (
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-lg mb-6">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 rounded-xl">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900">Quick Start Guide</CardTitle>
                            <CardDescription className="text-slate-600">
                                Complete these 5 steps to get the most out of your ERP system
                            </CardDescription>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDismissed(true)}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        Dismiss
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {steps.map((step) => {
                    const isCompleted = completedSteps.includes(step.id);
                    return (
                        <div
                            key={step.id}
                            onClick={() => toggleStep(step.id)}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${isCompleted
                                    ? 'bg-white border-2 border-emerald-200'
                                    : 'bg-white/50 border-2 border-transparent hover:bg-white hover:border-amber-200'
                                }`}
                        >
                            {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            ) : (
                                <Circle className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                                <div className={`font-bold ${isCompleted ? 'text-emerald-900 line-through' : 'text-slate-900'}`}>
                                    {step.title}
                                </div>
                                <div className="text-sm text-slate-600">{step.description}</div>
                            </div>
                        </div>
                    );
                })}
                <div className="flex items-center justify-between pt-3 border-t border-amber-200/50">
                    <div className="text-sm text-slate-600">
                        <span className="font-bold text-amber-600">{completedSteps.length}</span> of {steps.length} completed
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-slate-700 border-slate-300"
                            onClick={() => window.open('/docs/quick-start', '_blank')}
                        >
                            <BookOpen className="h-4 w-4 mr-2" />
                            Full Guide
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-slate-700 border-slate-300"
                            onClick={() => window.open('/docs/help', '_blank')}
                        >
                            <HelpCircle className="h-4 w-4 mr-2" />
                            Get Help
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
