const fs = require('fs');
const diff = fs.readFileSync('schema_diff.txt', 'utf8'); // Wait, we didn't recreate schema_diff.txt in UTF-8
const oldSql = fs.readFileSync('prisma/migrations/20260225235500_reversible_init/migration.sql', 'utf8');
const newSql = fs.readFileSync('current_utf8.sql', 'utf8');

function extractTables(sql) {
    const tables = {};
    const lines = sql.split('\n');
    let currentTable = null;
    for (let line of lines) {
        if (line.startsWith('CREATE TABLE')) {
            const match = line.match(/"([^"]+)"/);
            if (match) {
                currentTable = match[1];
                tables[currentTable] = [];
            }
        } else if (currentTable && line.trim().startsWith(';') || line.trim() === ');') {
            currentTable = null;
        } else if (currentTable) {
            if (line.trim() && !line.includes('CONSTRAINT') && !line.includes('PRIMARY KEY')) {
                tables[currentTable].push(line.trim());
            }
        }
    }
    return tables;
}

const oldTables = extractTables(oldSql);
const newTables = extractTables(newSql);

let alters = '';
for (const [table, cols] of Object.entries(newTables)) {
    if (!oldTables[table]) {
        continue;
    }

    const oldCols = new Set(oldTables[table].map(c => c.split(' ')[0]));
    const missingCols = cols.filter(c => !oldCols.has(c.split(' ')[0]));

    if (missingCols.length > 0) {
        const validAdds = missingCols.map(c => {
            let clean = c.endsWith(',') ? c.slice(0, -1) : c;
            if (!clean.includes('subscriptionStatus') && !clean.includes('planExpiresAt') && !clean.includes('gracePeriodEndsAt') && !clean.includes('suspendedAt') && !clean.includes('suspendReason')) {
                return `  ADD COLUMN IF NOT EXISTS ${clean}`;
            }
            return null;
        }).filter(Boolean);

        if (validAdds.length > 0) {
            alters += `-- Missing from ${table}\n`;
            alters += `ALTER TABLE "${table}"\n`;
            alters += validAdds.join(',\n') + ';\n\n';
        }
    }
}

console.log(alters);
