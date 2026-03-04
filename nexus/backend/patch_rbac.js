const fs = require('fs');
const glob = require('glob');
const path = require('path');

const rolePerms = {
    Owner: "ALL",
    Manager: ['CREATE_INVOICE', 'EDIT_INVOICE', 'RECORD_PAYMENT', 'ADJUST_STOCK', 'VIEW_PRODUCTS', 'VIEW_REPORTS', 'EXPORT_TALLY'],
    Biller: ['CREATE_INVOICE', 'RECORD_PAYMENT', 'VIEW_PRODUCTS'],
    Storekeeper: ['ADJUST_STOCK', 'VIEW_PRODUCTS'],
    Accountant: ['VIEW_REPORTS', 'LOCK_MONTH', 'EXPORT_TALLY', 'VIEW_PRODUCTS'],
    CA: ['VIEW_REPORTS', 'VIEW_PRODUCTS'],
    Customer: [],
    Supplier: []
};

const tsFiles = glob.sync('src/**/*.controller.ts', { cwd: __dirname });

tsFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    const lines = content.split('\n');
    let modifications = 0;

    // Check if the class itself has @Roles
    let hasClassRoles = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('export class')) break;
        if (lines[i].includes('@Roles(')) hasClassRoles = true;
    }

    if (hasClassRoles) {
        return; // Skip entire file if class has global Roles
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/@(Get|Post|Put|Patch|Delete)\(/)) {
            let hasSecurity = false;
            let j = i;

            while (j >= 0 && lines[j].trim().startsWith('@')) {
                if (lines[j].includes('@Roles') || lines[j].includes('@Public') || lines[j].includes('@AllowIdentity')) hasSecurity = true;
                j--;
            }
            j = i + 1;
            let permissionsMatch = null;
            while (j < lines.length && (lines[j].trim().startsWith('@') || lines[j].trim().length === 0)) {
                if (lines[j].includes('@Roles') || lines[j].includes('@Public') || lines[j].includes('@AllowIdentity')) hasSecurity = true;
                if (lines[j].includes('@Permissions(')) {
                    permissionsMatch = lines[j].match(/@Permissions\(Permission\.(\w+)\)/);
                }
                if (lines[j].trim().startsWith('@Get') || lines[j].trim().startsWith('@Post') || lines[j].trim().startsWith('@Put') || lines[j].trim().startsWith('@Patch') || lines[j].trim().startsWith('@Delete')) break;
                j++;
            }

            if (!hasSecurity) {
                let targetPerm = permissionsMatch ? permissionsMatch[1] : null;

                let appliedRoles = ['Role.Owner'];
                if (targetPerm) {
                    for (const [role, perms] of Object.entries(rolePerms)) {
                        if (role === 'Owner') continue;
                        if (perms.includes(targetPerm)) {
                            appliedRoles.push(`Role.${role}`);
                        }
                    }
                }

                const roleString = `@Roles(${appliedRoles.join(', ')})`;

                // Calculate whitespace to match the next line or current line
                const matchWhitespace = line.match(/^(\s*)/);
                const ws = matchWhitespace ? matchWhitespace[1] : '  ';

                lines.splice(i + 1, 0, `${ws}${roleString}`);
                modifications++;
                i++; // skip over the inserted line
            }
        }
    }

    if (modifications > 0) {
        // Find if import { Role } is present
        let hasImportRole = false;
        let lastImportIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('import') && lines[i].includes('@prisma/client') && lines[i].includes('Role')) {
                hasImportRole = true;
                break;
            }
            if (lines[i].startsWith('import')) {
                lastImportIndex = i;
            }
        }

        if (!hasImportRole) {
            // Check if @prisma/client is imported already
            let prismaClientIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('import') && lines[i].includes('@prisma/client')) {
                    prismaClientIndex = i;
                    break;
                }
            }

            if (prismaClientIndex !== -1) {
                // Modify existing import
                const val = lines[prismaClientIndex];
                if (val.includes('{') && !val.includes('Role')) {
                    lines[prismaClientIndex] = val.replace('{', '{ Role,');
                } else if (!val.includes('{')) {
                    lines[prismaClientIndex] = `import { Role } from '@prisma/client';\n` + val;
                }
            } else {
                lines.splice(lastImportIndex + 1, 0, `import { Role } from '@prisma/client';`);
            }
        }

        fs.writeFileSync(fullPath, lines.join('\n'));
        console.log(`Patched ${modifications} endpoints in ${file}`);
    }
});
