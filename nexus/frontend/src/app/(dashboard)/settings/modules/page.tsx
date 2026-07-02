"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { getAllModules } from "../../../../lib/module-registry";
import { Check, Loader2, Save } from "lucide-react";


export default function ModulesSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    // Load currently enabled modules
    const userStr = localStorage.getItem("k_user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.tenant?.enabledModules) {
          setSelected(new Set(user.tenant.enabledModules));
        }
      } catch {
        console.error("Failed to parse user");
      }
    }
  }, []);

  const toggleModule = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const selectedModules = Array.from(selected);
      // Desktop IPC bridge check
      if (typeof window !== "undefined" && window.nexusDesktop?.settings?.updateModules) {
        await window.nexusDesktop.settings.updateModules(selectedModules);
      } else {
        console.log("Modules saved (cloud stub):", selectedModules);
      }
      
      const userStr = localStorage.getItem("k_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        user.tenant = { ...user.tenant, enabledModules: selectedModules };
        localStorage.setItem("k_user", JSON.stringify(user));
      }
      
      // Force reload to apply new modules across the app
      window.location.href = "/portal/dashboard";
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError("Failed to save modules: " + err.message);
      } else {
        setError("Failed to save modules.");
      }
      setSaving(false);
    }
  };

  const modules = getAllModules();

  return (
    <div className="max-w-6xl mx-auto space-y-1.5">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Module Configuration</h1>
        <p className="text-slate-500 mt-1">Enable or disable features for your organization. Data is never deleted when a module is disabled.</p>
      </div>

      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Installed Modules</CardTitle>
              <CardDescription className="mt-1">
                Select the tools your team needs.
              </CardDescription>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-4 font-bold uppercase tracking-wider text-[10px]"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Configuration
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-3">
          {error && (
            <div className="mb-3 p-2.5 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl border border-rose-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {modules.map((mod) => {
              const isSelected = selected.has(mod.id);
              return (
                <div
                  key={mod.id}
                  onClick={() => toggleModule(mod.id)}
                  className={`
                    relative p-3 rounded-2xl border-2 cursor-pointer transition-all duration-200
                    ${isSelected 
                      ? 'border-emerald-600 bg-emerald-50/30' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {mod.category}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-emerald-600 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <h3 className={`font-bold text-base ${isSelected ? 'text-emerald-950' : 'text-slate-900'}`}>
                    {mod.name}
                  </h3>
                  <p className={`text-sm mt-2 ${isSelected ? 'text-emerald-900/70' : 'text-slate-500'}`}>
                    {mod.description}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
