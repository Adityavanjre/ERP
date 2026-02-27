
import * as dns from 'dns';
import * as ipaddr from 'ipaddr.js';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

/**
 * AR-7: SSRF (Server-Side Request Forgery) Protection Utility
 * 
 * This utility prevents the backend from making requests to:
 * 1. Private IP ranges (RFC 1918: 10.x, 172.16.x, 192.168.x)
 * 2. Loopback/Localhost (127.0.0.1, ::1)
 * 3. Link-local addresses (169.254.x - often contains cloud metadata)
 */
export async function isSafeUrl(url: string): Promise<boolean> {
    try {
        const parsed = new URL(url);

        // 1. Only allow HTTPS for external calls
        if (parsed.protocol !== 'https:') {
            return false;
        }

        // 2. Resolve hostname to IP
        const { address } = await lookup(parsed.hostname);
        const addr = ipaddr.parse(address);
        const range = addr.range();

        // 3. Block restricted ranges
        const restricted = [
            'private',
            'loopback',
            'linkLocal',
            'multicast',
            'broadcast',
            'unspecified'
        ];

        if (restricted.includes(range)) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Safe fetch wrapper that blocks SSRF attempts.
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
    const safe = await isSafeUrl(url);
    if (!safe) {
        throw new Error(`SSRF_BLOCK: Destination URL "${url}" is restricted or invalid.`);
    }
    return fetch(url, options);
}
