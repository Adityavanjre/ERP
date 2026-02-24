/**
 * LinkingEngine helps automate internal linking by mapping standard keywords
 * to their respective high-value industry or feature pages.
 */
export class LinkingEngine {
    static readonly linkMap: Record<string, string> = {
        'Manufacturing': '/portal/industries/manufacturing',
        'Healthcare': '/portal/industries/healthcare',
        'Construction': '/portal/industries/construction',
        'Logistics': '/portal/industries/logistics',
        'Retail': '/portal/industries/retail',
        'Bill of Materials': '/portal/industries/manufacturing',
        'BOM': '/portal/industries/manufacturing',
        'Production': '/portal/industries/manufacturing',
        'Pharmacy': '/portal/industries/healthcare',
        'Medical': '/portal/industries/healthcare',
        'Project Management': '/portal/industries/construction',
        'BOQ': '/portal/industries/construction',
        'Warehouse': '/portal/industries/logistics',
        'WMS': '/portal/industries/logistics',
        'Fleet': '/portal/industries/logistics',
        'POS': '/portal/industries/retail',
        'E-commerce': '/portal/industries/retail',
        'Inventory': '/portal/industries/manufacturing',
        'GST': '/portal/industries/retail',
        'GSTR-1': '/portal/industries/retail',
        'Tally Prime': '/portal/industries/manufacturing',
        'Stock Journal': '/portal/industries/manufacturing'
    };

    /**
     * Smartly suggests a link for a given text segment.
     */
    static getLinkForText(text: string): string | null {
        const lowerText = text.toLowerCase();
        const key = Object.keys(this.linkMap).find(k => lowerText.includes(k.toLowerCase()));
        return key ? this.linkMap[key] : null;
    }

    /**
     * Returns the full dictionary for automated parsers.
     */
    static getDictionary(): Record<string, string> {
        return this.linkMap;
    }
}
