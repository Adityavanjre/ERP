export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: "Core" | "Operations" | "Finance" | "Specialized";
  isRecommended?: boolean;
  icon?: string; // Optional icon name if using lucide-react dynamically
}

export const SYSTEM_MODULES: Record<string, ModuleDefinition> = {
  dashboard: {
    id: "dashboard",
    name: "Dashboard & Analytics",
    description: "Centralized overview of business performance and key metrics.",
    category: "Core",
    isRecommended: true,
  },
  sales: {
    id: "sales",
    name: "Sales & CRM",
    description: "Manage customers, leads, invoices, and sales pipelines.",
    category: "Core",
    isRecommended: true,
  },
  inventory: {
    id: "inventory",
    name: "Inventory Management",
    description: "Track stock levels, multiple warehouses, and product variants.",
    category: "Operations",
    isRecommended: true,
  },
  accounting: {
    id: "accounting",
    name: "Accounting & Finance",
    description: "Manage ledgers, journal entries, taxes, and financial reporting.",
    category: "Finance",
  },
  pos: {
    id: "pos",
    name: "Point of Sale (POS)",
    description: "Retail billing interface for fast checkout and barcode scanning.",
    category: "Operations",
  },
  projects: {
    id: "projects",
    name: "Project Management",
    description: "Track tasks, milestones, and project budgets.",
    category: "Specialized",
  },
  manufacturing: {
    id: "manufacturing",
    name: "Manufacturing",
    description: "Bill of Materials (BOM), production planning, and work orders.",
    category: "Specialized",
  },
  healthcare: {
    id: "healthcare",
    name: "Healthcare",
    description: "Patient management, prescriptions, and clinical records.",
    category: "Specialized",
  },
  logistics: {
    id: "logistics",
    name: "Logistics & Fleet",
    description: "Vehicle tracking, dispatch, and delivery management.",
    category: "Specialized",
  },
};

export const getAllModules = (): ModuleDefinition[] => Object.values(SYSTEM_MODULES);

export const getModuleById = (id: string): ModuleDefinition | undefined => SYSTEM_MODULES[id];
