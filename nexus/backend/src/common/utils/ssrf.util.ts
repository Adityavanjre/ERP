
import * as dns from 'dns';
import * as ipaddr from 'ipaddr.js';
import { promisify } from 'util';
import { Logger } from '@nestjs/common';

const lookup = promisify(dns.lookup);
const logger = new Logger('SsrfUtil');

/**
 * AR-7: SSRF (Server-Side Request Forgery) Protection Utility
 *
 * Prevents the backend from making requests to:
 * 1. Private IP ranges (RFC 1918: 10.x, 172.16.x, 192.168.x)
 * 2. Loopback/Localhost (127.0.0.1, ::1)
 * 3. Link-local addresses (169.254.x - often contains cloud metadata)
 *
 * BUG-FIX: Previously the catch block silently returned false on ANY error,
 * including transient DNS failures. This was incorrectly blocking legitimate
 * outbound calls (e.g., Resend API) during DNS hiccups and surfacing as
 * "SSRF_BLOCK" errors with no diagnostic information.
 *
 * Now:
 * - Actual SSRF (private/loopback IP) → returns false with warning log
 * - DNS resolution failure → throws so the caller can retry or alert
 * - Parse/URL error → throws with a clear message
 */
export async function isSafeUrl(url: string): Promise<boolean> {
    const parsed = new URL(url); // Throws on invalid URL — intentional, let it propagate

    // 1. Only allow HTTPS for external calls
    if (parsed.protocol !== 'https:') {
        logger.warn(`SSRF_BLOCK: Rejected non-HTTPS URL: ${url}`);
        return false;
    }

    // 2. Resolve hostname to IP — let DNS failures propagate to the caller for retry
    const { address } = await lookup(parsed.hostname);

    let addr: ipaddr.IPv4 | ipaddr.IPv6;
    try {
        addr = ipaddr.parse(address);
    } catch (parseErr: any) {
        // Extremely rare — address returned by OS DNS that ipaddr can't parse
        logger.error(`SSRF_BLOCK: Could not parse resolved IP '${address}' for ${url}: ${parseErr.message}`);
        return false;
    }

    const range = addr.range();

    // 3. Block restricted ranges
    const restricted = [
        'private',
        'loopback',
        'linkLocal',
        'multicast',
        'broadcast',
        'unspecified',
    ];

    if (restricted.includes(range)) {
        logger.warn(`SSRF_BLOCK: Rejected ${url} — resolved to restricted IP ${address} (range: ${range})`);
        return false;
    }

    return true;
}

/**
 * Safe fetch wrapper that blocks SSRF attempts.
 * Throws on DNS failures (allowing the caller to implement retry).
 * Throws on SSRF detection with a clear message.
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
    let safe: boolean;
    try {
        safe = await isSafeUrl(url);
    } catch (err: any) {
        // DNS failure or URL parse error — throw with full context
        throw new Error(`SSRF_CHECK_FAILED: Could not verify safety of "${url}": ${err.message}`);
    }

    if (!safe) {
        throw new Error(`SSRF_BLOCK: Destination URL "${url}" resolved to a restricted address and was blocked.`);
    }

    return fetch(url, options);
}
