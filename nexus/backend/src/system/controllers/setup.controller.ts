/**
 * SetupController: DISABLED
 *
 * The restore-admin endpoint has been permanently removed. It was a @Public()
 * unauthenticated endpoint that hardcoded admin credentials and returned them
 * in plaintext HTTP responses. This constitutes a catastrophic security vulnerability.
 *
 * Admin account recovery is now handled via:
 *   1. Direct DB seeding in controlled infrastructure environments only.
 *   2. A one-time CLI command requiring server-level access.
 *
 * DO NOT restore this endpoint.
 */
