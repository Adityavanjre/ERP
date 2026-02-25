import * as fs from 'fs';
import * as path from 'path';

// Note: In CI, we use a relative path to the shared package to avoid module resolution issues
const SHARED_WHITELIST_PATH = path.join(__dirname, '../../packages/shared/src/constants/mobile-whitelist.ts');

async function bootstrap() {
    console.log('--- Starting Mobile Governance Static Audit ---');

    // 1. Verify Global Guard Presence in AppModule
    const appModulePath = path.join(__dirname, '../src/app.module.ts');
    if (!fs.existsSync(appModulePath)) {
        console.error(`[CRITICAL] Cannot find AppModule at ${appModulePath}`);
        process.exit(1);
    }
    const appModuleContent = fs.readFileSync(appModulePath, 'utf8');
    if (!appModuleContent.includes('MobileWhitelistGuard')) {
        console.error('[CRITICAL] MobileWhitelistGuard is missing from AppModule providers! Security bypass detected.');
        process.exit(1);
    }
    console.log('✅ Global MobileWhitelistGuard confirmed.');

    // 2. Load Shared Whitelist (Simple parsing since we want to avoid complex compilation)
    if (!fs.existsSync(SHARED_WHITELIST_PATH)) {
        console.error(`[CRITICAL] Cannot find shared whitelist at ${SHARED_WHITELIST_PATH}`);
        process.exit(1);
    }
    const whitelistContent = fs.readFileSync(SHARED_WHITELIST_PATH, 'utf8');

    // Heuristic: Extract keys from the MOBILE_WHITELIST object
    // Looking for: 'ACTION_ID': {
    const whitelistedActions = [...whitelistContent.matchAll(/['"]([^'"]+)['"]:\s*{/g)].map(m => m[1]);
    console.log(`Loaded ${whitelistedActions.length} whitelisted actions from shared truth.`);

    // 3. Scan Controllers and Services
    const srcDir = path.join(__dirname, '../src');
    const controllers = findFiles(srcDir, '.controller.ts');
    const services = findFiles(srcDir, '.service.ts');

    let hasErrors = false;

    // Pre-scan services for forbidden patterns to flag potential leaks
    const serviceMutations: Record<string, string[]> = {};
    const forbiddenTables = ['LedgerEntry', 'Invoice', 'StockAdjustment', 'Payment'];

    for (const serviceFile of services) {
        const content = fs.readFileSync(serviceFile, 'utf8');
        const fileName = path.basename(serviceFile);

        for (const table of forbiddenTables) {
            const prismaCall = new RegExp(`prisma\\.${table.charAt(0).toLowerCase() + table.slice(1)}\\.(create|update|delete|upsert)`, 'i');
            if (prismaCall.test(content)) {
                if (!serviceMutations[fileName]) serviceMutations[fileName] = [];
                serviceMutations[fileName].push(table);
            }
        }
    }

    for (const file of controllers) {
        const content = fs.readFileSync(file, 'utf8');
        if (!content.includes('@MobileAction')) continue;

        const fileName = path.basename(file);
        const importedServices = [...content.matchAll(/import\s+{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g)]
            .map(m => m[1].split(',').map((s: string) => s.trim()))
            .flat();

        // Check if this controller imports a service that has forbidden mutations
        for (const serviceName of importedServices) {
            const matchingServiceFile = Object.keys(serviceMutations).find(f => f.includes(serviceName.replace('Service', '')));
            if (matchingServiceFile) {
                // Potential violation: Mobile-accessible controller uses a mutating service.
                // We check if the specific @MobileAction methods call these mutating services.
                const actionMatches = [...content.matchAll(/@MobileAction\(['"]([^'"]+)['"]\)/g)];
                for (const match of actionMatches) {
                    const actionId = match[1];
                    const methodRegex = new RegExp(`@MobileAction\\(['"]${actionId}['"]\\)\\s+([a-zA-Z0-9_]+)\\s*\\(`, 'm');
                    const methodMatch = content.match(methodRegex);

                    if (methodMatch) {
                        const methodName = methodMatch[1];
                        const methodBodyStart = content.indexOf('{', content.indexOf(methodMatch[0]));
                        // Find closing brace (simple match)
                        let braceCount = 1;
                        let i = methodBodyStart + 1;
                        while (braceCount > 0 && i < content.length) {
                            if (content[i] === '{') braceCount++;
                            if (content[i] === '}') braceCount--;
                            i++;
                        }
                        const methodBody = content.substring(methodBodyStart, i);

                        // If the method body calls the service, and the service is forbidden
                        const serviceInstanceMatch = content.match(new RegExp(`private\\s+readonly\\s+([a-zA-Z0-9_]+)\\s*:\\s*${serviceName}`, 'i'));
                        if (serviceInstanceMatch) {
                            const instanceName = serviceInstanceMatch[1];
                            if (methodBody.includes(`${instanceName}.`)) {
                                // This is a risk. We flag it for manual review OR block if it's one of the strictly forbidden ones on mobile.
                                // Except for "Draft" creation which is allowed if whitelisted.
                                if (actionId.includes('COMPLETE') || actionId.includes('POST_LEDGER')) {
                                    console.error(`[CRITICAL VIOLATION] ${fileName} method '${methodName}' (Action: ${actionId}) calls service ${serviceName} which performs forbidden ${serviceMutations[matchingServiceFile].join(', ')} mutations.`);
                                    hasErrors = true;
                                }
                            }
                        }
                    }
                }
            }
        }

        // --- RULE: Verify @MobileAction handles are whitelisted ---
        const actionMatches = [...content.matchAll(/@MobileAction\(['"]([^'"]+)['"]\)/g)];
        for (const match of actionMatches) {
            const actionId = match[1];
            if (!whitelistedActions.includes(actionId)) {
                console.error(`[VIOLATION] Action ID '${actionId}' in ${fileName} is missing from shared MOBILE_WHITELIST.`);
                hasErrors = true;
                continue;
            }

            // --- RULE: Enforce Draft-only intention for new records ---
            const methodRegex = new RegExp(`@MobileAction\\(['"]${actionId}['"]\\)\\s+([a-zA-Z0-9_]+)\\s*\\(`, 'm');
            const methodMatch = content.match(methodRegex);
            if (methodMatch) {
                const methodName = methodMatch[1];
                const methodBodyIndex = content.indexOf(methodMatch[0]);
                const snippetBefore = content.substring(Math.max(0, methodBodyIndex - 100), methodBodyIndex);

                if (snippetBefore.includes('@Post') || snippetBefore.includes('@Patch')) {
                    const segmentStart = whitelistContent.indexOf(`'${actionId}':`);
                    const segmentEnd = whitelistContent.indexOf('},', segmentStart);
                    const actionSegment = whitelistContent.substring(segmentStart, segmentEnd);

                    if (!actionSegment.includes('allowedStatusTransitions')) {
                        console.error(`[VIOLATION] Write-action '${actionId}' in ${fileName} lacks state-transition matrix in shared truth.`);
                        hasErrors = true;
                    }

                    if (!actionId.includes('APPROVE') && !actionId.includes('REJECT') && !actionId.includes('DECIDE') && !actionId.includes('SELECT')) {
                        const toMatches = [...actionSegment.matchAll(/to:\s*['"]([^'"]+)['"]/g)];
                        const nonDraft = toMatches.filter(m => m[1] !== 'Draft');
                        if (nonDraft.length > 0) {
                            console.error(`[VIOLATION] Write-action '${actionId}' allows non-Draft transition: ${nonDraft.map(m => m[1]).join(', ')}`);
                            hasErrors = true;
                        }
                    }
                }
            }
        }
    }

    if (hasErrors) {
        console.error('--- Audit Failed: Mobile Governance Violations Detected ---');
        process.exit(1);
    } else {
        console.log('--- Audit Passed: Mobile Governance Frozen & Secured ---');
        process.exit(0);
    }
}

function findFiles(dir: string, ext: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    files.forEach((file: string) => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findFiles(filePath, ext, fileList);
        } else if (file.endsWith(ext)) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

bootstrap();
