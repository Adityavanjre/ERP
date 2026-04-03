export interface IndustryFAQ {
    q: string;
    a: string;
}

export interface IndustryTheme {
    name: string;
    title: string;
    desc: string;
    features: string[];
    icon: string;
    faqs: IndustryFAQ[];
}

export const industryThemes: Record<string, IndustryTheme> = {
    manufacturing: {
        name: "Manufacturing",
        title: "Best ERP for Manufacturing India | Production & Inventory Software",
        desc: "Scale your factory with Klypso. Automated BOM, WIP tracking, and seamless Tally Export for Indian Manufacturers.",
        features: ["Recursive BOM Management", "Work Order Lifecycle", "Stock Journal Automation", "Scrap & Yield Analysis"],
        icon: "Settings2",
        faqs: [
            { q: "Does Klypso ERP support Tally Prime sync?", a: "Yes, Klypso provides a seamless Tally Prime export architecture for vouchers and masters." },
            { q: "Can it handle complex Bill of Materials?", a: "Klypso supports multi-level recursive BOMs with scrap management and yield analysis." }
        ]
    },
    healthcare: {
        name: "Healthcare",
        title: "Hospital & Pharmacy Management ERP | Medical Billing Software",
        desc: "Trusted by Indian clinics and hospitals. Patient lifecycle management, drug inventory, and insurance billing with GST.",
        features: ["Patient Billing & Records", "Pharmacy Serial Tracking", "Insurance Claim Workflow", "Doctor Schedule Management"],
        icon: "ShieldCheck",
        faqs: [
            { q: "Is Klypso ERP GST compliant for pharmaceuticals?", a: "Absolutely. Klypso handles HSN-wise GST, drug expiry tracking, and batch-wise inventory." },
            { q: "Support for insurance billing?", a: "Yes, it includes integrated insurance claim workflows and TPA management." }
        ]
    },
    construction: {
        name: "Construction",
        title: "Construction ERP | Real Estate Project Management & Accounting",
        desc: "Manage site-wise inventory and project accounts. Bill of Quantities (BOQ) tracking and contractor payment management.",
        features: ["Site Inventory Tracking", "BOQ & Contract Billing", "Sub-contractor Management", "Project Cost Analysis"],
        icon: "BarChart3",
        faqs: [
            { q: "How does it track site inventory?", a: "Klypso allows you to create unlimited site-warehouses and track stock transfers in real-time." },
            { q: "Can I manage contractor bills?", a: "Yes, Klypso includes a dedicated module for BOQ-based contractor billing and retention management." }
        ]
    },
    logistics: {
        name: "Logistics",
        title: "Logistics & Fleet ERP | Warehouse Management Software (WMS)",
        desc: "Total control over fleet and warehouse. Fuel tracking, driver advances, and automated freight accounting.",
        features: ["Fleet Maintenance & Fuel", "WMS & Barcoding", "Route Optimization Tracking", "Customs & Freight Logic"],
        icon: "CheckCircle2",
        faqs: [
            { q: "Does it support barcode scanning?", a: "Yes, the Klypso WMS module is fully integrated with mobile barcode and dynamic binning." },
            { q: "Support for freight accounting?", a: "Klypso automates freight billing, driver advances, and fuel efficiency tracking." }
        ]
    },
    retail: {
        name: "Retail & E-commerce",
        title: "Retail POS ERP | Multi-Store Inventory Management Software",
        desc: "The OS for modern Indian retail. Real-time POS, multi-warehouse sync, and automated GST GSTR-1 preparation.",
        features: ["Point of Sale (POS)", "Multi-store Sync", "Real-time Profit/Loss", "Promotion Engine"],
        icon: "CheckCircle2",
        faqs: [
            { q: "Can I sync multiple retail outlets?", a: "Yes, Klypso provides real-time multi-store synchronization for inventory and sales data." },
            { q: "Is the POS touch-friendly?", a: "Our cloud POS is optimized for touch devices and provides offline billing capabilities." }
        ]
    }
};
