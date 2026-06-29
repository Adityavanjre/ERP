/**
 * currency.ts — Dynamic currency symbol resolution.
 *
 * The currency is always read from `systemConfig` (fetched from the backend
 * GET /system/config endpoint, which reads the Tenant.currency field in DB).
 *
 * Do NOT hardcode ₹ or $ in components. Use getCurrencySymbol() instead.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AED: "د.إ",
  SGD: "S$",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF",
};

/**
 * Returns the currency symbol for a given ISO currency code.
 * Falls back to the code itself if no symbol is found.
 */
export function getCurrencySymbol(currencyCode?: string | null): string {
  if (!currencyCode) return "₹"; // Default INR for Indian market
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] ?? currencyCode;
}

/**
 * Formats a number with the currency symbol, using locale-appropriate separators.
 *
 * @param amount     - The numeric value to format
 * @param currency   - ISO currency code (e.g. "INR", "USD")
 * @param locale     - Optional locale string; defaults to "en-IN" for INR, "en-US" otherwise
 */
export function formatCurrency(
  amount: number,
  currency?: string | null,
  locale?: string,
): string {
  const code = (currency ?? "INR").toUpperCase();
  const symbol = getCurrencySymbol(code);
  const defaultLocale = code === "INR" ? "en-IN" : "en-US";
  const formatted = amount.toLocaleString(locale ?? defaultLocale);
  return `${symbol}${formatted}`;
}
