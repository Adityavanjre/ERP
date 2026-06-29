"use client";

import { useState, useEffect } from "react";

import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../../components/ui/card";
import { getAllModules, type ModuleDefinition } from "../../../lib/module-registry";
import { Check, Loader2 } from "lucide-react";
import { api } from "../../../lib/api";

export default function ModuleSetupPage() {

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set(
    getAllModules().filter((m: ModuleDefinition) => m.isRecommended).map((m: ModuleDefinition) => m.id)
  ));
  const [error, setError] = useState("");

  // Load the currently-saved module list from the backend on mount
  useEffect(() => {
    api.get("system/config")
      .then((res) => {
        const savedModules: string[] = res.data?.enabledModules ?? [];
        if (savedModules.length > 0) {
          setSelected(new Set(savedModules));
        }
      })
      .catch(() => {
        // If config fetch fails, keep the recommended defaults
      })
      .finally(() => setInitializing(false));
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

  const handleComplete = async () => {
    setLoading(true);
    setError("");
    try {
      const selectedModules = Array.from(selected);

      if (typeof window !== "undefined" && window.nexusDesktop?.settings?.updateModules) {
        // Desktop app: use IPC bridge
        await window.nexusDesktop.settings.updateModules(selectedModules);
      } else {
        // Web: persist to backend DB
        await api.patch("system/modules", { modules: selectedModules });
      }

      // Force reload to dashboard so sidebar recalculates with new modules
      window.location.href = "/portal/dashboard";
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError("Failed to save module configuration: " + err.message);
      } else {
        setError("Failed to save module configuration.");
      }
      setLoading(false);
    }
  };

  const modules = getAllModules();

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-xl border-0 rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-900 text-white p-8">
          <CardTitle className="text-2xl font-black tracking-tight">
            Configure Your Workspace
          </CardTitle>
          <CardDescription className="text-slate-400 mt-2">
            Select the modules you need. You can always change this later in Settings.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl border border-rose-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => {
              const isSelected = selected.has(mod.id);
              return (
                <div
                  key={mod.id}
                  onClick={() => toggleModule(mod.id)}
                  className={`
                    relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200
                    ${isSelected 
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white stroke-[3]" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 h-full">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                        {mod.category}
                      </span>
                      {mod.isRecommended && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wider">
                          Recommended
                        </span>
                      )}
                    </div>
                    <h3 className={`font-bold text-lg ${isSelected ? 'text-blue-950' : 'text-slate-900'}`}>
                      {mod.name}
                    </h3>
                    <p className={`text-sm mt-auto ${isSelected ? 'text-blue-900/70' : 'text-slate-500'}`}>
                      {mod.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 p-8 border-t border-slate-100 flex justify-between items-center">
          <p className="text-sm font-bold text-slate-500">
            {selected.size} modules selected
          </p>
          <Button
            onClick={handleComplete}
            disabled={loading || initializing || selected.size === 0}
            className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-xs"
          >
            {(loading || initializing) ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
            {initializing ? "Loading..." : "Finish Setup"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
