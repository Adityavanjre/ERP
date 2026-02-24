import React from 'react';
import { CheckCircle2, ShieldCheck, BarChart3, Settings2, LucideIcon } from "lucide-react";

export interface IndustryTheme {
    slug: string;
    name: string;
    title: string;
    desc: string;
    features: string[];
    iconName: string; // Storing as string to avoid React elements in constants if needed, but we can store components too.
}

export const industryThemes: Record<string, any> = {
    manufacturing: {
        name: "Manufacturing",
        title: "Best ERP for Manufacturing India | Production & Inventory Software",
        desc: "Scale your factory with Nexus. Automated BOM, WIP tracking, and seamless Tally Export for Indian Manufacturers.",
        features: ["Recursive BOM Management", "Work Order Lifecycle", "Stock Journal Automation", "Scrap & Yield Analysis"],
        icon: "Settings2",
        faqs: [
            { q: "Does Nexus ERP support Tally Prime sync?", a: "Yes, Nexus provides a seamless Tally Prime export architecture for vouchers and masters." },
            { q: "Can it handle complex Bill of Materials?", a: "Nexus supports multi-level recursive BOMs with scrap management and yield analysis." }
        ]
    },
    healthcare: {
        name: "Healthcare",
        title: "Hospital & Pharmacy Management ERP | Medical Billing Software",
        desc: "Trusted by Indian clinics and hospitals. Patient lifecycle management, drug inventory, and insurance billing with GST.",
        features: ["Patient Billing & Records", "Pharmacy Serial Tracking", "Insurance Claim Workflow", "Doctor Schedule Management"],
        icon: "ShieldCheck",
        faqs: [
            { q: "Is Nexus ERP GST compliant for pharmaceuticals?", a: "Absolutely. Nexus handles HSN-wise GST, drug expiry tracking, and batch-wise inventory." },
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
            { q: "How does it track site inventory?", a: "Nexus allows you to create unlimited site-warehouses and track stock transfers in real-time." },
            { q: "Can I manage contractor bills?", a: "Yes, Nexus includes a dedicated module for BOQ-based contractor billing and retention management." }
        ]
    },
    logistics: {
        name: "Logistics",
        title: "Logistics & Fleet ERP | Warehouse Management Software (WMS)",
        desc: "Total control over fleet and warehouse. Fuel tracking, driver advances, and automated freight accounting.",
        features: ["Fleet Maintenance & Fuel", "WMS & Barcoding", "Route Optimization Tracking", "Customs & Freight Logic"],
        icon: "CheckCircle2",
        faqs: [
            { q: "Does it support barcode scanning?", a: "Yes, the Nexus WMS module is fully integrated with mobile barcode and dynamic binning." },
            { q: "Support for freight accounting?", a: "Nexus automates freight billing, driver advances, and fuel efficiency tracking." }
        ]
    },
    retail: {
        name: "Retail & E-commerce",
        title: "Retail POS ERP | Multi-Store Inventory Management Software",
        desc: "The OS for modern Indian retail. Real-time POS, multi-warehouse sync, and automated GST GSTR-1 preparation.",
        features: ["Point of Sale (POS)", "Multi-store Sync", "Real-time Profit/Loss", "Promotion Engine"],
        icon: "CheckCircle2",
        faqs: [
            { q: "Can I sync multiple retail outlets?", a: "Yes, Nexus provides real-time multi-store synchronization for inventory and sales data." },
            { q: "Is the POS touch-friendly?", a: "Our cloud POS is optimized for touch devices and provides offline billing capabilities." }
        ]
    }
};
