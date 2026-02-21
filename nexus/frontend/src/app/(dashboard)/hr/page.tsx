
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
import { Plus, Users, Calendar, Banknote, Building2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function HrPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ activeEmployees: 0, pendingLeaves: 0, totalPayroll: 0 });
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Add Employee Dialog State
    const [addOpen, setAddOpen] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [empForm, setEmpForm] = useState({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "", employeeId: "", salary: "" });

    const syncEmployeeData = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            setFetchError(null);
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
        } catch (err: any) {
            console.error("HR data load failed:", err);
            const msg = "Failed to load HR data. Please refresh.";
            setFetchError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        syncEmployeeData(true);

        // CONTINUOUS BACKGROUND SYNC: 30s interval
        const interval = setInterval(() => syncEmployeeData(false), 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAddEmployee = async () => {
        if (!empForm.firstName || !empForm.lastName || !empForm.employeeId) {
            toast.error("First name, last name, and Employee ID are required.");
            return;
        }
        try {
            setAddLoading(true);
            await api.post("/hr/employees", {
                ...empForm,
                salary: empForm.salary ? Number(empForm.salary) : 0,
            });
            toast.success("Employee added successfully");
            setAddOpen(false);
            setEmpForm({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "", employeeId: "", salary: "" });
            syncEmployeeData(true);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to add employee");
        } finally {
            setAddLoading(false);
        }
    };

    const handleLeaveAction = async (leaveId: string, action: 'Approved' | 'Rejected') => {
        try {
            await api.patch(`/hr/leaves/${leaveId}/status`, { status: action });
            toast.success(`Leave ${action.toLowerCase()} successfully`);
            syncEmployeeData(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Action failed");
        }
    };

    if (!mounted) return null;

    return (
        <div className="flex-1 space-y-6 md:space-y-8 pt-2 md:pt-6 px-4 md:px-8 w-full max-w-full overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <Users className="mr-4 h-8 w-8 md:h-9 md:w-9 text-blue-600 shadow-sm" />
                        Employees & HR
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Manage employees, payroll, leaves, and departments.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full md:w-auto justify-center rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold px-8 shadow-lg shadow-blue-500/20 text-white h-11 whitespace-nowrap">
                                <Plus className="mr-2 h-4 w-4" /> Add Employee
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-600" /> New Employee</DialogTitle>
                                <DialogDescription>Fill in the employee details below.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">First Name *</Label>
                                        <Input value={empForm.firstName} onChange={e => setEmpForm(p => ({ ...p, firstName: e.target.value }))} placeholder="e.g. Rahul" className="h-10" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Last Name *</Label>
                                        <Input value={empForm.lastName} onChange={e => setEmpForm(p => ({ ...p, lastName: e.target.value }))} placeholder="e.g. Sharma" className="h-10" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Employee ID *</Label>
                                        <Input value={empForm.employeeId} onChange={e => setEmpForm(p => ({ ...p, employeeId: e.target.value }))} placeholder="e.g. EMP-001" className="h-10 font-mono" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Job Title</Label>
                                        <Input value={empForm.jobTitle} onChange={e => setEmpForm(p => ({ ...p, jobTitle: e.target.value }))} placeholder="e.g. Engineer" className="h-10" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email</Label>
                                        <Input type="email" value={empForm.email} onChange={e => setEmpForm(p => ({ ...p, email: e.target.value }))} placeholder="email@company.com" className="h-10" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Phone</Label>
                                        <Input value={empForm.phone} onChange={e => setEmpForm(p => ({ ...p, phone: e.target.value }))} placeholder="9876543210" className="h-10 font-mono" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Monthly Gross Salary (INR)</Label>
                                    <Input type="number" value={empForm.salary} onChange={e => setEmpForm(p => ({ ...p, salary: e.target.value }))} placeholder="0" className="h-10 font-mono" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addLoading}>Cancel</Button>
                                <Button onClick={handleAddEmployee} disabled={addLoading} className="bg-blue-600 hover:bg-blue-700 font-bold">
                                    {addLoading ? "Saving..." : "Add Employee"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Employees</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">{stats.activeEmployees}</div>
                        <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-tighter">On-site Staff</p>
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
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Disbursement</CardTitle>
                        <Banknote className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">₹{Number(stats.totalPayroll).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                        <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-tighter">Net Payroll Amount</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="employees" className="space-y-6 md:space-y-8">
                <TabsList className="bg-slate-100 border-slate-200 p-1.5 rounded-2xl h-auto w-full flex flex-wrap justify-start overflow-x-auto snap-x">
                    <TabsTrigger value="employees" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-4 md:px-8 py-2.5 font-bold transition-all snap-start">Employee Directory</TabsTrigger>
                    <TabsTrigger value="departments" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-4 md:px-8 py-2.5 font-bold transition-all snap-start">Departments</TabsTrigger>
                    <TabsTrigger value="leaves" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-4 md:px-8 py-2.5 font-bold transition-all snap-start">Leaves & Absence</TabsTrigger>
                    <TabsTrigger value="payroll" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-4 md:px-8 py-2.5 font-bold transition-all snap-start">Payroll Ledger</TabsTrigger>
                </TabsList>

                <TabsContent value="employees">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-4 md:px-8">
                            <CardTitle className="text-slate-900 text-xl font-black">Employee List</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Master database of all employees</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto max-w-[100vw] sm:max-w-none">
                            <Table className="min-w-[800px]">
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest pl-8">Employee ID</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Job Title</TableHead>
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
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-4 md:px-8">
                            <CardTitle className="text-slate-900 text-xl font-black">Department Groups</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Structural mapping of business departments</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 md:p-8">
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
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-4 md:px-8">
                            <CardTitle className="text-slate-900 text-xl font-black">Absence Records</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Personnel leave requests and availability tracking</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto max-w-[100vw] sm:max-w-none">
                            <Table className="min-w-[800px]">
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
                                                <div className="flex items-center justify-end gap-2">
                                                    <Badge className={leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase' : leave.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-none font-black text-[10px] uppercase' : 'bg-rose-50 text-rose-600 border-none font-black text-[10px] uppercase'}>
                                                        {leave.status}
                                                    </Badge>
                                                    {leave.status === 'Pending' && (
                                                        <>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={() => handleLeaveAction(leave.id, 'Approved')} title="Approve">
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => handleLeaveAction(leave.id, 'Rejected')} title="Reject">
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
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
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-4 md:px-8">
                            <CardTitle className="text-slate-900 text-xl font-black">Compensation Ledger</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Disbursement history and financial personnel mapping</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto max-w-[100vw] sm:max-w-none">
                            <Table className="min-w-[800px]">
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
