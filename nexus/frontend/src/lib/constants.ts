export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const COUNTRY_CODES = [
  { code: "+91", country: "IN", label: "IN +91" },
  { code: "+1", country: "US", label: "US +1" },
  { code: "+44", country: "GB", label: "UK +44" },
  { code: "+61", country: "AU", label: "AU +61" },
  { code: "+971", country: "AE", label: "UAE +971" },
  { code: "+65", country: "SG", label: "SG +65" },
];

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export function validatePhone(phone: string, countryCode: string): boolean {
  if (!phone.trim()) return true;
  const digits = phone.replace(/\D/g, '');
  if (countryCode === '+91') {
    return INDIAN_PHONE_REGEX.test(digits);
  }
  return digits.length >= 7 && digits.length <= 15;
}

export function formatPhone(phone: string, countryCode: string): string | undefined {
  if (!phone.trim()) return undefined;
  return `${countryCode} ${phone.trim()}`;
}
