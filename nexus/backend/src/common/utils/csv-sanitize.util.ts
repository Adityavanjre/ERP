/**
 * CSV Formula Injection Sanitizer
 *
 * Spreadsheet applications (Excel, LibreOffice, Google Sheets) interpret cell values
 * beginning with =, +, -, or @ as executable formulas. A malicious actor can craft
 * an Account Name, Customer Name, or Product SKU that executes code when the exported
 * CSV is opened by an accountant.
 *
 * This utility prefixes dangerous leading characters with a tab character,
 * which neutralises the formula while preserving readability in the spreadsheet.
 *
 * Reference: OWASP CSV Injection
 * https://owasp.org/www-community/attacks/CSV_Injection
 */

const FORMULA_PREFIX_CHARS = /^[=+\-@|]/;

/**
 * Sanitize a single CSV cell value to prevent formula injection.
 */
export function sanitizeCsvCell(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (FORMULA_PREFIX_CHARS.test(str)) {
        // Prefix with tab to neutralize formula interpretation
        return `\t${str}`;
    }
    return str;
}

/**
 * Convert an array of objects to a safe CSV string.
 * All string cell values are sanitized against formula injection.
 */
export function objectsToSafeCsv(rows: Record<string, unknown>[]): string {
    if (!rows.length) return '';

    const headers = Object.keys(rows[0]);
    const headerRow = headers.map(sanitizeCsvCell).join(',');

    const dataRows = rows.map((row) =>
        headers
            .map((h) => {
                const val = sanitizeCsvCell(row[h]);
                // Wrap in quotes if value contains comma, newline, or quote
                if (val.includes(',') || val.includes('\n') || val.includes('"')) {
                    return `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            })
            .join(','),
    );

    return [headerRow, ...dataRows].join('\n');
}
