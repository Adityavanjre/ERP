const fs = require('fs');
const glob = require('glob');
const path = require('path');

const tsFiles = glob.sync('src/**/*.controller.ts', { cwd: __dirname });

let missingCount = 0;

tsFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    const content = fs.readFileSync(fullPath, 'utf8');

    // For simplicity, we just look at each line. If a line is a method declaration (starts with whitespace, word( or async word() and preceded by @Get/Post/Put/Patch/Delete
    // We can just split by @Get/Post/Put/Patch/Delete and check if between it and the previous one we have @Roles / @Public / @AllowIdentity. Wait, @Roles can be strictly below @Get.

    // A better regex: match `@(?:Get|Post|Put|Patch|Delete)\b[^)]*\)(?:[\s\S]*?)?(?:async\s+)?(\w+)\s*\(`
    // No, a method block is decorators then method.
    // Let's just regex all decorators and methods.

    const methodRegex = /@(Get|Post|Put|Patch|Delete)\([^\)]*\)\s*(?:@\w+\([^\)]*\)\s*)*?(?:async\s+)?(?:[\w_]+)\s*\(/g;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/@(Get|Post|Put|Patch|Delete)/)) {
            // Found an HTTP method decorator. Check the block of decorators around it.
            // Go up and down to find @Roles, @Public, @AllowIdentity, until we hit the method definition.
            let hasSecurity = false;
            let j = i;
            // check above
            while (j >= 0 && lines[j].trim().startsWith('@')) {
                if (lines[j].includes('@Roles') || lines[j].includes('@Public') || lines[j].includes('@AllowIdentity')) {
                    hasSecurity = true;
                }
                j--;
            }
            j = i + 1;
            // check below
            while (j < lines.length && (lines[j].trim().startsWith('@') || lines[j].trim().length === 0)) {
                if (lines[j].includes('@Roles') || lines[j].includes('@Public') || lines[j].includes('@AllowIdentity')) {
                    hasSecurity = true;
                }
                if (lines[j].trim().startsWith('@Get') || lines[j].trim().startsWith('@Post') || lines[j].trim().startsWith('@Put') || lines[j].trim().startsWith('@Patch') || lines[j].trim().startsWith('@Delete')) break;
                j++;
            }
            if (!hasSecurity) {
                // See if the class has a global @Roles
                const classDecoratorBlock = content.slice(0, content.indexOf('export class'));
                if (classDecoratorBlock.includes('@Roles') || classDecoratorBlock.includes('@Public')) {
                    hasSecurity = true;
                }
            }

            if (!hasSecurity) {
                // get method name
                let k = j;
                while (k < lines.length) {
                    if (!lines[k].trim().startsWith('@') && lines[k].trim() !== '') {
                        const methodMatch = lines[k].match(/(?:async\s+)?([a-zA-Z0-9_]+)\s*\(/);
                        if (methodMatch) {
                            console.log(`[!] ${file}: missing RBAC on ${methodMatch[1]}`);
                            missingCount++;
                        }
                        break;
                    }
                    k++;
                }
            }
        }
    }
});

console.log(`\nTotal missing: ${missingCount}`);
