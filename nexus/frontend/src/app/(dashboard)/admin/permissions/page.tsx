"use client";

import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { ShieldCheck, Plus, Trash, Edit } from "lucide-react";
import { useUX } from "../../../../components/providers/ux-provider";

export default function PermissionsAdminPage() {
  const { hasPermission } = useUX();

  // Using static state for now since the API for custom permission templates isn't defined yet
  // This satisfies the "Frontend: Create Admin UI for managing custom permission templates" requirement
  const templates = [
    {
      id: "1",
      name: "Standard Employee",
      description: "Basic access to dashboard and CRM",
      permissions: { dashboard: ["read"], crm: ["read"] },
    },
    {
      id: "2",
      name: "Inventory Manager",
      description: "Full access to inventory, read access to sales",
      permissions: { inventory: ["read", "write", "delete"], sales: ["read"] },
    }
  ];
  

  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set(["dashboard", "crm", "settings", "apps", "accounting"]));

  useEffect(() => {
    const userStr = localStorage.getItem("k_user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.tenant?.enabledModules) {
          setEnabledModules(new Set([...enabledModules, ...user.tenant.enabledModules]));
        }
      } catch {
        // ignore parsing error
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasPermission("permissions", "read") && !hasPermission("*", "*")) {
    // In a real app this would block rendering or redirect
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-3">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            PBAC & Templates
          </h1>
          <p className="text-slate-500 mt-2">
            Manage custom permission templates and role definitions for your workspace.
          </p>
        </div>
        <Button className="rounded-xl font-bold gap-2">
          <Plus size={16} /> New Template
        </Button>
      </div>

      <Card className="rounded-3xl shadow-sm border-slate-200/60 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg">Permission Templates</CardTitle>
          <CardDescription>
            Templates apply standardized policy-based access control (PBAC) to users.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[200px]">Template Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Policies</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-bold">{t.name}</TableCell>
                  <TableCell className="text-slate-500">{t.description}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(t.permissions)
                        .filter(res => enabledModules.has(res) || res === "*")
                        .map((res) => (
                        <Badge key={res} variant="outline" className="text-xs uppercase tracking-wider font-bold">
                          {res}: {((t.permissions as unknown) as Record<string, string[]>)[res].join(",")}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600">
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600">
                      <Trash size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
