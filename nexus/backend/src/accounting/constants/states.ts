export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export const normalizeState = (state: string): string => {
  if (!state) return '';
  const clean = state.trim().toLowerCase();

  // Mapping of common abbreviations/misspellings
  const mapping: Record<string, string> = {
    mh: 'Maharashtra',
    dl: 'Delhi',
    ka: 'Karnataka',
    tn: 'Tamil Nadu',
    ts: 'Telangana',
    up: 'Uttar Pradesh',
    wb: 'West Bengal',
    gj: 'Gujarat',
    hr: 'Haryana',
    pj: 'Punjab',
    rj: 'Rajasthan',
    mp: 'Madhya Pradesh',
    ap: 'Andhra Pradesh',
    kl: 'Kerala',
    br: 'Bihar',
    jh: 'Jharkhand',
    ct: 'Chhattisgarh',
    ga: 'Goa',
    hp: 'Himachal Pradesh',
    jk: 'Jammu and Kashmir',
    la: 'Ladakh',
    mn: 'Manipur',
    ml: 'Meghalaya',
    mz: 'Mizoram',
    nl: 'Nagaland',
    or: 'Odisha',
    sk: 'Sikkim',
    tr: 'Tripura',
    uk: 'Uttarakhand',
    an: 'Andaman and Nicobar Islands',
    ch: 'Chandigarh',
    dn: 'Dadra and Nagar Haveli and Daman and Diu',
    ld: 'Lakshadweep',
    py: 'Puducherry',
  };

  if (mapping[clean]) return mapping[clean];

  // Fuzzy match: check if clean state starts with any of the full names
  const match = INDIAN_STATES.find(
    (s) =>
      s.toLowerCase().startsWith(clean) || clean.startsWith(s.toLowerCase()),
  );
  return match || state; // Return original if no match
};
