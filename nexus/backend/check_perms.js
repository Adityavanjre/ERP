const fs = require('fs');
const glob = require('glob');
const path = require('path');

const modules = ['accounting', 'crm', 'hr', 'manufacturing'];
let missing = 0;

modules.forEach(mod => {
    const tsFiles = glob.sync(`src/${mod}/**/*.controller.ts`, { cwd: __dirname });
    tsFiles.forEach(file => {
        const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(/@(Get|Post|Put|Patch|Delete)\(/)) {
                let hasPerms = false;

                // Check below
                let j = i + 1;
                while (j < lines.length && (lines[j].trim().startsWith('@') || lines[j].trim() === '')) {
                    if (lines[j].includes('@Permissions(')) hasPerms = true;
                    j++;
                }

                // Check above
                j = i - 1;
                while (j >= 0 && (lines[j].trim().startsWith('@') || lines[j].trim() === '')) {
                    if (lines[j].includes('@Permissions(')) hasPerms = true;
                    j--;
                }

                // Check class level
                const classBlock = content.slice(0, content.indexOf('export class'));
                if (classBlock.includes('@Permissions(')) hasPerms = true;

                if (!hasPerms) {
                    console.log(`[!] Missing @Permissions in ${file} at line ${i + 1}: ${line.trim()}`);
                    missing++;
                }
            }
        }
    });
});

console.log(`Total missing: ${missing}`);
