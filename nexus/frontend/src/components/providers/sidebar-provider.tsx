"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

interface SidebarContextType {
  collapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
}

const STORAGE_KEY = "nexus_sidebar_collapsed";

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) === "true";
    }
    return false;
  });

  const lastUserToggleRef = useRef<number>(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const toggle = useCallback(() => {
    lastUserToggleRef.current = Date.now();
    setCollapsed((prev) => !prev);
  }, []);

  const collapse = useCallback(() => {
    setCollapsed(true);
  }, []);

  const expand = useCallback(() => {
    setCollapsed(false);
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, collapse, expand }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
}
