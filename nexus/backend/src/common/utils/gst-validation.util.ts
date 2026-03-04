/**
 * GSTIN Validation Logic (ISO/IEC 7064 Mod 36, 37)
 * The 15th character is a checksum based on the first 14.
 */
export function validateGSTIN(gstin: string): boolean {
    if (!gstin || gstin.length !== 15) return false;

    // Structural Regex Check
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!regex.test(gstin.toUpperCase())) return false;

    const charMap = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const input = gstin.toUpperCase();
    let sum = 0;

    for (let i = 0; i < 14; i++) {
        const val = charMap.indexOf(input[i]);
        if (val === -1) return false; // Should not happen with regex valid

        // Alternate weights: 1 for odd positions, 2 for even positions
        const multiplier = (i % 2 === 0) ? 1 : 2;
        const prod = val * multiplier;

        // Mod 36 sum: add quotient and remainder
        sum += Math.floor(prod / 36) + (prod % 36);
    }

    const remainder = sum % 36;
    const checksumValue = (36 - remainder) % 36;

    return input[14] === charMap[checksumValue];
}
