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
    queriesPaginated: 0,
    queuesGivenRetries: 0
};

function remediateFile(filePath) {
    if (!filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Queue Processor Resiliency
    if (content.includes('@Processor')) {
        content = content.replace(/@Processor\(['"]([^'"]+)['"]\)/g, `@Processor({ name: '$1', options: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } } })`);
        if (content !== original) stats.queuesGivenRetries++;
    }

    // Safe Query Pagination - ONLY targets empty findMany() explicitly
    if (filePath.endsWith('.service.ts')) {
        let matches = content.match(/\.findMany\(\s*\)/g);
        if (matches && matches.length > 0) {
            content = content.replace(/\.findMany\(\s*\)/g, `.findMany({ take: 1000 })`);
            stats.queriesPaginated += matches.length;
        }
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Remediated: ${filePath}`);
    }
}

console.log('Initiating Safe Auto-Remediation Sequence...');
walkDir(BACKEND_DIR, remediateFile);
console.log('Remediation complete.', stats);
