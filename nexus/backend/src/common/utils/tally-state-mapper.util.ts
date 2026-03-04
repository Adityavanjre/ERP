export function mapTallyState(state: string | null | undefined): string {
    if (!state) return 'Not Applicable';
    const s = state.trim().toLowerCase();

    const stateMap: Record<string, string> = {
        'ap': 'Andhra Pradesh', 'andhra pradesh': 'Andhra Pradesh',
        'ar': 'Arunachal Pradesh', 'arunachal pradesh': 'Arunachal Pradesh',
        'as': 'Assam', 'assam': 'Assam',
        'br': 'Bihar', 'bihar': 'Bihar',
        'cg': 'Chhattisgarh', 'chhattisgarh': 'Chhattisgarh',
        'ga': 'Goa', 'goa': 'Goa',
        'gj': 'Gujarat', 'gujarat': 'Gujarat',
        'hr': 'Haryana', 'haryana': 'Haryana',
        'hp': 'Himachal Pradesh', 'himachal pradesh': 'Himachal Pradesh',
        'jh': 'Jharkhand', 'jharkhand': 'Jharkhand',
        'ka': 'Karnataka', 'karnataka': 'Karnataka',
        'kl': 'Kerala', 'kerala': 'Kerala',
        'mp': 'Madhya Pradesh', 'madhya pradesh': 'Madhya Pradesh',
        'mh': 'Maharashtra', 'maharashtra': 'Maharashtra',
        'mn': 'Manipur', 'manipur': 'Manipur',
        'ml': 'Meghalaya', 'meghalaya': 'Meghalaya',
        'mz': 'Mizoram', 'mizoram': 'Mizoram',
        'nl': 'Nagaland', 'nagaland': 'Nagaland',
        'or': 'Odisha', 'odisha': 'Odisha',
        'pb': 'Punjab', 'punjab': 'Punjab',
        'rj': 'Rajasthan', 'rajasthan': 'Rajasthan',
        'sk': 'Sikkim', 'sikkim': 'Sikkim',
        'tn': 'Tamil Nadu', 'tamil nadu': 'Tamil Nadu',
        'tg': 'Telangana', 'ts': 'Telangana', 'telangana': 'Telangana',
        'tr': 'Tripura', 'tripura': 'Tripura',
        'up': 'Uttar Pradesh', 'uttar pradesh': 'Uttar Pradesh',
        'uk': 'Uttarakhand', 'uttarakhand': 'Uttarakhand',
        'wb': 'West Bengal', 'west bengal': 'West Bengal',
        'an': 'Andaman and Nicobar Islands', 'andaman and nicobar islands': 'Andaman and Nicobar Islands',
        'ch': 'Chandigarh', 'chandigarh': 'Chandigarh',
        'dh': 'Dadra & Nagar Haveli and Daman & Diu', 'dd': 'Dadra & Nagar Haveli and Daman & Diu', 'dn': 'Dadra & Nagar Haveli and Daman & Diu', 'dadra and nagar haveli and daman and diu': 'Dadra & Nagar Haveli and Daman & Diu', 'dadra & nagar haveli and daman & diu': 'Dadra & Nagar Haveli and Daman & Diu',
        'dl': 'Delhi', 'delhi': 'Delhi',
        'jk': 'Jammu & Kashmir', 'jammu and kashmir': 'Jammu & Kashmir', 'jammu & kashmir': 'Jammu & Kashmir',
        'la': 'Ladakh', 'ladakh': 'Ladakh',
        'ld': 'Lakshadweep', 'lakshadweep': 'Lakshadweep',
        'py': 'Puducherry', 'puducherry': 'Puducherry'
    };

    return stateMap[s] || 'Not Applicable';
}
