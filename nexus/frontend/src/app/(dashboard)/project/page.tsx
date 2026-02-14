
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    ClipboardList,
    Plus,
    Calendar,
    CheckCircle2,
    Clock,
    LayoutGrid,
    ListTodo,
    Check,
    X,
    Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

export default function ProjectPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ total: 0, active: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Task Management
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [projectTasks, setProjectTasks] = useState<any[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState("");

    const [formData, setFormData] = useState({ name: "", description: "", startDate: "", endDate: "", status: "Planning" });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projRes, statsRes] = await Promise.all([
                api.get("/projects"),
                api.get("/projects/stats")
            ]);
            setProjects(projRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error(err);
            toast.error("Project synchronization failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchTasks = async (projectId: string) => {
        try {
            const res = await api.get(`/projects/tasks/all?projectId=${projectId}`);
            setProjectTasks(res.data);
        } catch (err) {
            toast.error("Failed to load tasks");
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/projects", formData);
            setShowForm(false);
            setFormData({ name: "", description: "", startDate: "", endDate: "", status: "Planning" });
            toast.success("Project initialized successfully");
            fetchData();
        } catch (err) {
            toast.error("Project creation failed");
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject || !newTaskTitle.trim()) return;

        try {
            await api.post("/projects/tasks", {
                title: newTaskTitle,
                projectId: selectedProject.id,
                status: "Pending", // Default
                priority: "Medium"
            });
            setNewTaskTitle("");
            toast.success("Task added");
            fetchTasks(selectedProject.id);
            fetchData(); // Refresh progress bars
        } catch (err) {
            toast.error("Task creation failed");
        }
    };

    const toggleTaskStatus = async (task: any) => {
        const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
        try {
            // Optimistic update
            setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

            await api.patch(`/projects/tasks/${task.id}/status`, { status: newStatus });
            fetchData(); // Refresh global progress
        } catch (err) {
            toast.error("Status update failed");
            fetchTasks(selectedProject.id); // Revert
        }
    };

    if (loading) return <LoadingSpinner className="h-full" text="Loading Projects..." />;

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <ClipboardList className="mr-4 h-9 w-9 text-blue-600 shadow-sm" />
                        Projects
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Manage projects, track progress, and coordinate tasks.</p>
                </div>
                <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold px-8 shadow-lg shadow-blue-500/20 text-white h-11" onClick={() => setShowForm(!showForm)}>
                    <Plus className="mr-2 h-4 w-4" /> New Project
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Projects</CardTitle>
                        <LayoutGrid className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">{stats.total}</div>
                        <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-tighter">Active projects</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Progress</CardTitle>
                        <Activity className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-600 tracking-tighter">{stats.active}</div>
                        <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-tighter">Active now</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-indigo-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completion Rate</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-indigo-600 tracking-tighter">
                            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                        </div>
                        <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-tighter">Overall progress</p>
                    </CardContent>
                </Card>
            </div>

            {showForm && (
                <Card className="bg-white border-slate-200 shadow-2xl rounded-3xl overflow-hidden border-none mb-8 animate-in fade-in slide-in-from-top-4">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                        <CardTitle className="text-slate-900 font-black text-xl">New Project</CardTitle>
                        <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Create a new project workspace</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Project Name</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20 font-bold" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Description</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20 font-medium" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Start Date</Label>
                                <Input type="date" className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20 font-bold" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">End Date</Label>
                                <Input type="date" className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20 font-bold" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                                <Button type="button" variant="ghost" className="text-slate-400 font-bold" onClick={() => setShowForm(false)}>Cancel</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl h-12 px-8">Create Project</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => {
                    const progress = project.tasks?.length > 0
                        ? (project.tasks.filter((t: any) => t.status === 'Completed').length / project.tasks.length) * 100
                        : 0;

                    return (
                        <Card key={project.id} className="bg-white border-slate-200 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group overflow-hidden border-none">
                            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-indigo-600 overflow-hidden">
                                <div className="h-full bg-slate-900/10" style={{ width: `${100 - progress}%`, float: 'right' }} />
                            </div>
                            <CardHeader className="pb-4 bg-slate-50/50">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="secondary" className={`border-none font-black text-[9px] uppercase tracking-widest ${project.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                                        project.status === 'InProgress' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {project.status === 'InProgress' ? 'Active Sync' : project.status}
                                    </Badge>
                                    <div className="text-[10px] text-slate-400 font-black tracking-widest">#{project.id.slice(0, 6).toUpperCase()}</div>
                                </div>
                                <CardTitle className="text-slate-900 text-xl font-black tracking-tight">{project.name}</CardTitle>
                                <CardDescription className="line-clamp-2 mt-1 font-medium text-slate-500">{project.description || "Operational parameters not defined."}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Progress</span>
                                        <span className="text-blue-600">{Math.round(progress)}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2 bg-slate-100" indicatorClassName="bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3.5 w-3.5 text-slate-300" />
                                        {project.startDate ? new Date(project.startDate).toLocaleDateString() : "TBD"}
                                    </div>
                                    <div className="flex items-center gap-2 justify-end">
                                        <Clock className="h-3.5 w-3.5 text-slate-300" />
                                        {project.endDate ? new Date(project.endDate).toLocaleDateString() : "ETL INF"}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button variant="ghost" className="w-full text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest h-10 rounded-xl">
                                        Archive
                                    </Button>
                                    <Button
                                        className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest h-10 rounded-xl shadow-lg shadow-slate-900/10 transition-all active:scale-95"
                                        onClick={() => {
                                            setSelectedProject(project);
                                            fetchTasks(project.id);
                                        }}
                                    >
                                        <ListTodo className="h-3.5 w-3.5 mr-2" />
                                        Tasks ({project.tasks?.length || 0})
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
                {projects.length === 0 && (
                    <div className="col-span-full py-32 text-center text-slate-400 font-black uppercase tracking-[0.2em] border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/50">
                        No projects found.
                    </div>
                )}
            </div>

            <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
                <DialogContent className="bg-white border-none shadow-2xl rounded-[32px] overflow-hidden p-0 max-w-2xl">
                    <div className="bg-slate-900 p-10 pb-16">
                        <DialogTitle className="flex items-center gap-4 text-white text-3xl font-black tracking-tight">
                            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/40">
                                <ListTodo className="h-6 w-6 text-white" />
                            </div>
                            Task Management
                        </DialogTitle>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-6 flex items-center gap-2">
                            Project: <span className="text-blue-400">{selectedProject?.name}</span>
                        </p>
                    </div>

                    <div className="p-10 -mt-10 bg-white rounded-t-[32px] space-y-8">
                        <form onSubmit={handleCreateTask} className="flex gap-3">
                            <Input
                                placeholder="New task..."
                                className="bg-slate-50 border-slate-200 text-slate-900 rounded-2xl h-14 px-6 font-bold focus:ring-blue-500/20"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                            />
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 rounded-2xl h-14 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Add Task</Button>
                        </form>

                        <div className="h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                            <div className="space-y-3">
                                {projectTasks.map((task) => (task && (
                                    <div key={task.id} className={cn(
                                        "group flex items-center justify-between p-5 rounded-[20px] border transition-all",
                                        task.status === 'Completed'
                                            ? "bg-slate-50/50 border-slate-100"
                                            : "bg-white border-slate-200 shadow-sm hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5"
                                    )}>
                                        <div className="flex items-center gap-4">
                                            <button
                                                type="button"
                                                onClick={() => toggleTaskStatus(task)}
                                                className={cn(
                                                    "h-7 w-7 rounded-xl border-2 flex items-center justify-center transition-all",
                                                    task.status === 'Completed'
                                                        ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20"
                                                        : "border-slate-200 hover:border-blue-500"
                                                )}
                                            >
                                                {task.status === 'Completed' && <Check className="h-4 w-4 text-white" />}
                                            </button>
                                            <span className={cn(
                                                "text-sm font-black tracking-tight transition-colors",
                                                task.status === 'Completed' ? "text-slate-400 line-through" : "text-slate-900"
                                            )}>
                                                {task.title}
                                            </span>
                                        </div>
                                        <Badge variant="secondary" className={cn(
                                            "text-[9px] font-black border-none px-3 py-1 rounded-lg uppercase tracking-widest",
                                            task.priority === 'High' ? "bg-rose-50 text-rose-600" :
                                                task.priority === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {task.priority || 'Normal'}
                                        </Badge>
                                    </div>
                                )))}
                                {projectTasks.length === 0 && (
                                    <div className="text-center py-20 text-slate-300 font-bold italic">
                                        No tasks found.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Activity(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}
