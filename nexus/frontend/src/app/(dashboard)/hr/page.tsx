
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Plus, Users, Calendar, Banknote, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function HrPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ activeEmployees: 0, pendingLeaves: 0, totalPayroll: 0 });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [empRes, leaveRes, payrollRes, deptRes, statsRes] = await Promise.all([
                api.get("hr/employees"),
                api.get("hr/leaves"),
                api.get("hr/payroll"),
                api.get("hr/departments"),
                api.get("hr/stats")
            ]);
            setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
            setLeaves(Array.isArray(leaveRes.data) ? leaveRes.data : []);
            setPayrolls(Array.isArray(payrollRes.data) ? payrollRes.data : []);
            setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
            setStats(statsRes.data || { activeEmployees: 0, pendingLeaves: 0, totalPayroll: 0 });
        } catch (err) {
            console.error(err);
            toast.error("Failed to load HR data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <Users className="mr-4 h-9 w-9 text-blue-600 shadow-sm" />
                        Human Capital Intelligence
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Manage personnel, payroll, and organizational structure.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold px-8 shadow-lg shadow-blue-500/20 text-white h-11">
                        <Plus className="mr-2 h-4 w-4" /> Add Personnel
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Headcount</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">{stats.activeEmployees}</div>
                        <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-tighter">Active personnel</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Leaves</CardTitle>
                        <Calendar className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-amber-600 tracking-tighter">{stats.pendingLeaves}</div>
                        <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-tighter">Awaiting approval</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Payroll</CardTitle>
                        <Banknote className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">₹{Number(stats.totalPayroll).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                        <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-tighter">Total disbursed cycle</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="employees" className="space-y-8">
                <TabsList className="bg-slate-100 border-slate-200 p-1.5 rounded-2xl h-auto">
                    <TabsTrigger value="employees" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-8 py-2.5 font-bold transition-all">Personnel</TabsTrigger>
                    <TabsTrigger value="departments" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-8 py-2.5 font-bold transition-all">Departments</TabsTrigger>
                    <TabsTrigger value="leaves" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-8 py-2.5 font-bold transition-all">Leave Flow</TabsTrigger>
                    <TabsTrigger value="payroll" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-8 py-2.5 font-bold transition-all">Payroll Ledger</TabsTrigger>
                </TabsList>

                <TabsContent value="employees">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                            <CardTitle className="text-slate-900 text-xl font-black">Personnel Registry</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Master database of all employees</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest pl-8">Employee ID</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Full Designation</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Department</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Functional Title</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-right pr-8">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(employees || []).map((emp) => (
                                        <TableRow key={emp.id} className="border-slate-100 hover:bg-slate-50/50 transition-all group">
                                            <TableCell className="font-black text-[10px] text-blue-600 tracking-widest pl-8 bg-slate-50/30">#{emp.employeeId.toUpperCase()}</TableCell>
                                            <TableCell className="font-black text-slate-900 tracking-tight">{emp.firstName} {emp.lastName}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[9px] rounded-md border-none uppercase tracking-tighter">{emp.department?.name || "UNASSIGNED"}</Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-600 font-bold text-sm tracking-tight">{emp.jobTitle}</TableCell>
                                            <TableCell className="text-right pr-8">
                                                <Badge className={emp.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase' : 'bg-slate-100 text-slate-400 border-none font-black text-[10px] uppercase'}>
                                                    {emp.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!employees || employees.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-bold italic">No personnel records found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="departments">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                            <CardTitle className="text-slate-900 text-xl font-black">Organization Clusters</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Structural mapping of business departments</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {Array.isArray(departments) && departments.map((dept) => (
                                    <Card key={dept.id} className="bg-slate-50/50 border-slate-100 hover:border-blue-500/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all group rounded-2xl">
                                        <CardHeader className="pb-6">
                                            <div className="p-3 bg-white w-fit rounded-xl shadow-sm mb-4 border border-slate-100 group-hover:border-blue-100 transition-all">
                                                <Building2 className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <CardTitle className="text-lg font-black text-slate-900 tracking-tight">{dept.name}</CardTitle>
                                            <CardDescription className="text-blue-600 font-bold uppercase text-[10px] tracking-widest mt-1">{dept._count.employees} team members networked</CardDescription>
                                        </CardHeader>
                                    </Card>
                                ))}
                                {(!departments || departments.length === 0) && (
                                    <div className="col-span-full text-center py-20 text-slate-400 font-bold italic">No departments configured.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="leaves">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                            <CardTitle className="text-slate-900 text-xl font-black">Absence Records</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Personnel leave requests and availability tracking</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest pl-8">Requester</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Category</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Chronology</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-right pr-8">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(leaves || []).map((leave) => (
                                        <TableRow key={leave.id} className="border-slate-100 hover:bg-slate-50/50 transition-all group">
                                            <TableCell className="pl-8 font-black text-slate-900 tracking-tight">{leave.employee.firstName} {leave.employee.lastName}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[9px] rounded-md border-none uppercase tracking-tighter">{leave.type}</Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-500 font-bold text-xs">
                                                {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <Badge className={leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase' : leave.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-none font-black text-[10px] uppercase' : 'bg-rose-50 text-rose-600 border-none font-black text-[10px] uppercase'}>
                                                    {leave.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!leaves || leaves.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-20 text-slate-400 font-bold italic">No leave requests found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payroll">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                            <CardTitle className="text-slate-900 text-xl font-black">Compensation Ledger</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Disbursement history and financial personnel mapping</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest pl-8">Cycle Period</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Recipient</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Net Disbursement</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-right pr-8">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(payrolls || []).map((p) => (
                                        <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50/50 transition-all group">
                                            <TableCell className="pl-8 text-slate-500 font-bold text-xs">{new Date(p.periodStart).toLocaleDateString()} — {new Date(p.periodEnd).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-black text-slate-900 tracking-tight">{p.employee.firstName} {p.employee.lastName}</TableCell>
                                            <TableCell className="font-black text-slate-900">₹{Number(p.netPay).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</TableCell>
                                            <TableCell className="text-right pr-8"><Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase">{p.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                    {(!payrolls || payrolls.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-20 text-slate-400 font-bold italic">No payroll history found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
