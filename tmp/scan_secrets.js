const fs = require('fs');
const path = require('path');

const secretsRegexes = [
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
    { name: 'Generic Secret/Key', regex: /(secret|passwd|password|api_key|apikey|token|auth_token)\s*[:=]\s*['"][A-Za-z0-9_\-\.\+]{10,}['"]/gi },
    { name: 'JWT Token', regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
    { name: 'Stripe Key', regex: /sk_(test|live)_[0-9a-zA-Z]{24}/g },
    { name: 'Github Token', regex: /ghp_[0-9a-zA-Z]{36}/g },
    { name: 'Hardcoded Bearer', regex: /Bearer\s+[A-Za-z0-9\-\._~\+/]+=*/gi }
];

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (['node_modules', '.git', '.next', 'dist', 'build', 'tmp', '.gemini'].includes(file)) continue;
        const fullPath = path.join(dir, file);
        try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                scanDir(fullPath);
            } else if (stat.isFile() && ['.js', '.ts', '.tsx', '.json', '.yaml', '.txt', '.env', '.mjs', '.cjs'].includes(path.extname(fullPath))) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    secretsRegexes.forEach(({ name, regex }) => {
                        let match;
                        while ((match = regex.exec(content)) !== null) {
                            // If the generic secret matches things like Process.env.JWT_SECRET, ignore it.
                            if (match[0].includes('process.env') || match[0].includes('process.cwd')) continue;
                            console.log(`FOUND ${name} in ${fullPath}: ${match[0].substring(0, 50)}`);
                        }
                    });
                } catch (e) { }
            }
        } catch (e) { }
    }
}

console.log("Starting manual security scan...");
scanDir('D:/code/ERP');
console.log("Scan complete.");
