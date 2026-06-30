export function getCurrencySymbol(currency?: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    INR: "₹",
    CAD: "CA$",
    AUD: "A$",
    JPY: "¥",
    CNY: "¥",
    CHF: "Fr",
    SEK: "kr",
    NOK: "kr",
    DKK: "kr",
    SGD: "S$",
    HKD: "HK$",
    NZD: "NZ$",
    KRW: "₩",
    BRL: "R$",
    MXN: "MX$",
    ZAR: "R",
  };
  return symbols[currency || "INR"] || "₹";
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}