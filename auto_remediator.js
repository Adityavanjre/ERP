const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'nexus', 'backend', 'src');

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

let stats = {
    controllersSecured: 0,
    queriesPaginated: 0,
    queuesGivenRetries: 0
};

function getRelativeImport(fromPath, toPath) {
    let rel = path.relative(path.dirname(fromPath), toPath).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    return rel.replace('.ts', '');
}

function remediateFile(filePath) {
    if (!filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    const name = path.basename(filePath);

    // 1. Controller Security Hardening (Adding @UseGuards at class level)
    if (name.endsWith('.controller.ts') && !name.includes('auth') && !name.includes('health') && !name.includes('webhook') && !name.includes('b2b')) {
        if (content.includes('@Controller') && !content.includes('@UseGuards')) {
            const guardPath = path.join(BACKEND_DIR, 'common', 'guards', 'jwt-auth.guard.ts');
            const rolePath = path.join(BACKEND_DIR, 'common', 'guards', 'roles.guard.ts');

            const relGuard = getRelativeImport(filePath, guardPath);
            const relRole = getRelativeImport(filePath, rolePath);

            // Add import if missing
            let importAdd = '';
            if (!content.includes('JwtAuthGuard')) importAdd += `import { JwtAuthGuard } from '${relGuard}';\n`;
            if (!content.includes('RolesGuard')) importAdd += `import { RolesGuard } from '${relRole}';\n`;

            content = importAdd + content;

            // Update @nestjs/common import to include UseGuards
            if (!content.includes('UseGuards')) {
                content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]@nestjs\/common['"]/, (match, p1) => {
                    return `import { ${p1.trim()}, UseGuards } from '@nestjs/common'`;
                });
            }

            // Inject before @Controller
            content = content.replace(/@Controller\(([^)]*)\)/, `@UseGuards(JwtAuthGuard, RolesGuard)\n@Controller($1)`);
            stats.controllersSecured++;
        }
    }

    // 2. Query Safety - Pagination limits on findMany to prevent OOM
    if (name.endsWith('.service.ts')) {
        let modified = false;
        content = content.replace(/\.findMany\(\s*\{([\s\S]*?)\}/g, (match, inner) => {
            if (!inner.includes('take:') && inner.trim().length > 0) {
                modified = true;
                stats.queriesPaginated++;
                return `.findMany({ take: 1000, ${inner}}`;
            }
            return match;
        });

        // Blind findMany()
        content = content.replace(/\.findMany\(\s*\)/g, () => {
            stats.queriesPaginated++;
            return `.findMany({ take: 1000 })`;
        });
    }

    // 3. Queue Processor Resiliency
    if (name.includes('.processor.ts')) {
        if (content.includes('@Processor') && !content.includes('attempts:')) {
            content = content.replace(/@Processor\(['"]([^'"]+)['"]\)/, `@Processor({ name: '$1', options: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } } })`);
            stats.queuesGivenRetries++;
        }
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Remediated: ${filePath}`);
    }
}

console.log('Initiating Enterprise Auto-Remediation Sequence...');
walkDir(BACKEND_DIR, remediateFile);
console.log('Remediation complete.', stats);
