
"use client";

import React from 'react';
import { Calendar, Clock, Plus, Search, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const appointments = [
    { id: 'APT-101', patient: 'John Doe', doctor: 'Dr. Sarah Smith', time: '09:30 AM', type: 'Consultation', status: 'Confirmed' },
    { id: 'APT-102', patient: 'Jane Smith', doctor: 'Dr. Mike Johnson', time: '10:45 AM', type: 'Surgery Followup', status: 'Pending' },
    { id: 'APT-103', patient: 'Emily Wilson', doctor: 'Dr. Sarah Smith', time: '11:15 AM', type: 'General Checkup', status: 'Cancelled' },
    { id: 'APT-104', patient: 'Michael Brown', doctor: 'Dr. Alex Reed', time: '02:00 PM', type: 'Diagnostic', status: 'Confirmed' },
];

export default function AppointmentsPage() {
    return (
        <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-600 rounded-3xl shadow-xl shadow-blue-500/20">
                        <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase tracking-widest">Appointments</h1>
                        <p className="text-slate-500 font-medium">Manage patient bookings and hospital scheduling.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 px-8 py-6 h-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Book Appointment
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="rounded-[2.5rem] border-slate-100 shadow-sm border-none bg-white p-2">
                    <CardHeader className="px-8 pt-8">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-black uppercase tracking-widest">Today's Schedule</CardTitle>
                            <Badge className="bg-blue-50 text-blue-700 border-none font-black px-3 py-1">12 Slots Left</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-8 space-y-4">
                        {appointments.map((apt) => (
                            <div key={apt.id} className="group p-5 rounded-3xl bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all border border-transparent hover:border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs",
                                        apt.status === 'Confirmed' ? "bg-emerald-100 text-emerald-700" :
                                            apt.status === 'Cancelled' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                                    )}>
                                        {apt.time.split(' ')[0]}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-800 text-sm">{apt.patient}</span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{apt.doctor} • {apt.type}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{apt.id}</span>
                                    {apt.status === 'Confirmed' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Clock className="h-5 w-5 text-amber-500" />}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-none shadow-sm bg-slate-900 p-2 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full" />
                    <CardHeader className="px-8 pt-8 relative z-10">
                        <CardTitle className="text-white text-lg font-black uppercase tracking-widest">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="px-8 pb-8 relative z-10 grid grid-cols-2 gap-4">
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
                            <div className="p-3 bg-blue-500/20 rounded-2xl w-fit group-hover:scale-110 transition-all">
                                <Plus className="h-6 w-6 text-blue-400" />
                            </div>
                            <h4 className="text-white font-black mt-4 uppercase text-[10px] tracking-widest">New Patient</h4>
                        </div>
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
                            <div className="p-3 bg-emerald-500/20 rounded-2xl w-fit group-hover:scale-110 transition-all">
                                <Calendar className="h-6 w-6 text-emerald-400" />
                            </div>
                            <h4 className="text-white font-black mt-4 uppercase text-[10px] tracking-widest">Calendar</h4>
                        </div>
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group col-span-2">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500/20 rounded-2xl w-fit group-hover:scale-110 transition-all">
                                    <AlertCircle className="h-6 w-6 text-amber-400" />
                                </div>
                                <div>
                                    <h4 className="text-white font-black uppercase text-[10px] tracking-widest">Emergency Ward</h4>
                                    <p className="text-white/40 text-[9px] mt-1 font-bold">CONTACT ON-CALL DOCTOR IMMEDIATELY</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
