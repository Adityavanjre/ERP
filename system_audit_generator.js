const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            if (['node_modules', '.git', 'dist', 'build'].includes(f)) continue;
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    }
}

// Data structures
const report = {
    modules: [],
    controllers: [],
    services: [],
    middleware: [],
    guards: [],
    interceptors: [],
    cronJobs: [],
    events: [],
    queue: [],
    utils: [],
    config: [],
    envVars: new Set(),
    endpoints: [],
    dbMutations: [],
    dbReads: [],
    frontEndCalls: []
};

function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath);
    const name = path.basename(filePath);

    // Match backend things
    if (name.endsWith('.module.ts')) report.modules.push(filePath);
    if (name.endsWith('.controller.ts')) {
        report.controllers.push(filePath);
        extractEndpoints(filePath, content);
    }
    if (name.endsWith('.service.ts')) report.services.push(filePath);
    if (name.endsWith('.middleware.ts')) report.middleware.push(filePath);
    if (name.endsWith('.guard.ts')) report.guards.push(filePath);
    if (name.endsWith('.interceptor.ts')) report.interceptors.push(filePath);

    if (content.includes('@Cron(') || name.endsWith('cron.ts')) report.cronJobs.push(filePath);
    if (content.includes('@OnEvent(') || content.includes('EventEmitter')) report.events.push(filePath);
    if (content.includes('@Process(') || content.includes('@Processor(')) report.queue.push(filePath);
    if (name.endsWith('.util.ts') || filePath.includes('\\utils\\')) report.utils.push(filePath);

    // Database mutations & reads (Prisma based)
    if (ext === '.ts') {
        extractDatabaseOperations(filePath, content);
    }

    // Frontend/Mobile API calls
    if (filePath.includes('frontend') || filePath.includes('agency') || filePath.includes('mobile')) {
        if (ext === '.ts' || ext === '.js' || ext === '.tsx' || ext === '.jsx') {
            extractClientCalls(filePath, content);
        }
    }

    // Environment variables
    const envMatches = content.match(/process\.env\.[A-Za-z0-9_]+/g);
    if (envMatches) {
        envMatches.forEach(m => report.envVars.add(m));
    }
}

function extractEndpoints(filePath, content) {
    // Regex to find Controller path
    const ctrlMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/);
    const basePath = ctrlMatch ? ctrlMatch[1] : '';

    // Regex to find endpoints Get, Post, etc
    const methodRegex = /@(Get|Post|Put|Patch|Delete)\(['"]([^'"]*)['"]\)?/g;
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
        const httpMethod = match[1].toUpperCase();
        const routePath = match[2];
        const fullPath = `/${basePath}/${routePath}`.replace(/\/\//g, '/');

        // Find line number using index
        const substring = content.substring(0, match.index);
        const lineNumber = substring.split('\n').length;

        // Try to find the method name (it usually follows immediately or soon after)
        const methodBodyRest = content.substring(match.index);
        const nameMatch = methodBodyRest.match(/(?:async\s+)?([a-zA-Z0-9_]+)\s*\(/);
        const handlerName = nameMatch ? nameMatch[1] : 'unknown';

        // simple check for Roles, Guards
        const hasUseGuards = methodBodyRest.substring(0, 500).includes('@UseGuards');
        const hasRoles = methodBodyRest.substring(0, 500).includes('@Roles');

        report.endpoints.push({
            file: path.basename(filePath),
            method: httpMethod,
            path: fullPath,
            handler: handlerName,
            lineNumber,
            auth: hasUseGuards ? 'Requires Guard' : 'None Detected',
            roles: hasRoles ? 'Role Checked' : 'None Detected'
        });
    }
}

function extractDatabaseOperations(filePath, content) {
    // Prisma matches: .create(, .update(, .delete(, .upsert(, .updateMany(, .deleteMany(
    const writes = content.match(/\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\s*\(/g);
    if (writes) {
        writes.forEach(w => {
            report.dbMutations.push({
                file: path.basename(filePath),
                op: w.replace(/\s*\(/, '')
            });
        });
    }

    // Prisma matches: .findUnique(, .findFirst(, .findMany(, .count(
    const reads = content.match(/\.(findUnique|findFirst|findMany|count|aggregate)\s*\(/g);
    if (reads) {
        reads.forEach(r => {
            report.dbReads.push({
                file: path.basename(filePath),
                op: r.replace(/\s*\(/, '')
            });
        });
    }
}

function extractClientCalls(filePath, content) {
    // looking for axios, fetch, or similar
    const fetchMatches = content.match(/(?:axios\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]|fetch\(['"]([^'"]+)['"])/g);
    if (fetchMatches) {
        fetchMatches.forEach(m => {
            report.frontEndCalls.push({
                file: path.basename(filePath),
                call: m
            });
        });
    }
}

console.log('Scanning directory...');
walkDir(__dirname, analyzeFile);

console.log('Generating report...');

let md = `# Comprehensive System Audit Report

## Phase 1 — Full System Discovery

### 1. Modules (${report.modules.length})
${report.modules.map(m => '- ' + m).join('\n')}

### 2. Controllers (${report.controllers.length})
${report.controllers.map(m => '- ' + m).join('\n')}

### 3. Services (${report.services.length})
${report.services.map(m => '- ' + m).join('\n')}

### 4. Middleware & Guards (${report.middleware.length + report.guards.length})
${report.middleware.concat(report.guards).map(m => '- ' + m).join('\n')}

### 5. Interceptors (${report.interceptors.length})
${report.interceptors.map(m => '- ' + m).join('\n')}

### 6. Background Workers, Schedulers & Cron Jobs (${report.cronJobs.length})
${report.cronJobs.map(m => '- ' + m).join('\n')}

### 7. Event Emitters & Queue Processors (${report.events.length + report.queue.length})
${report.events.concat(report.queue).map(m => '- ' + m).join('\n')}

### 8. Utilities (${report.utils.length})
${report.utils.slice(0, 100).map(m => '- ' + m).join('\n')}
*(Truncated if too long)*

### 9. Environment Variables Referenced
${Array.from(report.envVars).map(m => '- ' + m).join('\n')}

---

## Phase 2 — Complete API Endpoint Inventory
*Total Endpoints Discovered: ${report.endpoints.length}*

| File | Method | Path | Handler | Auth Guard | Role Check |
|---|---|---|---|---|---|
${report.endpoints.map(e => `| ${e.file} | **${e.method}** | \`${e.path}\` | ${e.handler} | ${e.auth} | ${e.roles} |`).join('\n')}

---

## Phase 3 — API Execution Verification (Simulated)
*Warning: Static analysis cannot actively execute endpoints. This represents the verification requirement checklist for QA context.*

- **Action Required**: Provide manual or automated E2E tests for the endpoints listed above.
- Verify status codes (2xx, 4xx, 5xx).
- Verify Rate Limiting, CSRF enforcement, error structure.

---

## Phase 4 — Mutation Operation Inventory
*Total Database Writes Discovered: ${report.dbMutations.length}*

| File | Operation |
|---|---|
${report.dbMutations.map(m => `| ${m.file} | ${m.op} |`).join('\n')}

---

## Phase 5 — Data Read Operation Audit
*Total Database Reads Discovered: ${report.dbReads.length}*

| File | Operation |
|---|---|
${report.dbReads.map(m => `| ${m.file} | ${m.op} |`).join('\n')}

---

## Phase 6 & 7 — Frontend/Mobile Communication Audit
*Total Client API Calls Discovered in Frontends: ${report.frontEndCalls.length}*

| File | Call Match |
|---|---|
${report.frontEndCalls.map(m => `| ${m.file} | \`${m.call}\` |`).join('\n')}

---

## Phase 8 — Event and Background Job Audit
Please refer to Phase 1 (Event Emitters & Queue Processors). Retry policies and Dead letter queues must be verified in specific queue configurations (e.g. Bull queue initializations).

---

## Phase 9 — Guard and Security Coverage
Refer to Phase 2 for Endpoint-level Guard/Role mappings. 

---

## Phase 10 — Inter-Service Communication
*Action Required: Dynamic or deep AST analysis is required for full service-to-service dependency graphing.*
Observed services: ${report.services.length}.

---

## Phase 11 — End-to-End Workflow Verification
*Action Required: E2E Cypress/Playwright tests needed for core business flows.*

---

## Phase 12 — Concurrency and Race Condition Testing
*Action Required: Use tools like JMeter or Artillery to trigger concurrency tests on mutations.*

---

## Phase 13 — Observability and Logging Verification
Codebase log statements must be audited manually for sensitive PII. Standard Nest logger usage should be consistent.

---

## Phase 14 — Performance and Load Validation
*Action Required: Active Load testing required.*

---

## Phase 15 — Final System Health Report
**Status**: GENERATED STATIC DISCOVERY REPORT
**Certification**: PENDING LIVE LOAD/E2E RESULTS

`;

fs.writeFileSync(path.join(__dirname, 'Full_System_Audit_Report.md'), md);
console.log('Report saved to Full_System_Audit_Report.md');
