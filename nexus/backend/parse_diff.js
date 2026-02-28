const fs = require('fs');
const diff = fs.readFileSync('schema_diff.txt', 'utf8');

const lines = diff.split('\n');
let currentTable = null;
const additions = {};

for (const line of lines) {
    // track context
    const cleanLine = line.replace(/^[+\- ]/, '').trim();
    if (cleanLine.startsWith('CREATE TABLE')) {
        currentTable = cleanLine.match(/"([^"]+)"/)[1];
    } else if (cleanLine === ');' || cleanLine === '') {
        currentTable = null;
    }

    if (line.startsWith('+ ') && !line.startsWith('+++')) {
        if (currentTable) {
            if (!additions[currentTable]) additions[currentTable] = [];
            additions[currentTable].push(cleanLine);
        } else {
            if (cleanLine && !cleanLine.includes('CREATE INDEX') && !cleanLine.includes('CREATE UNIQUE INDEX')) {
                // console.log("Added outside table:", cleanLine);
            }
        }
    }
}

for (const [table, cols] of Object.entries(additions)) {
    if (table === 'BillingEvent') continue; // already handled
    const validCols = cols.filter(c => !c.includes('subscriptionStatus') && !c.includes('planExpiresAt') && !c.includes('gracePeriodEndsAt') && !c.includes('suspendedAt') && !c.includes('suspendReason') && !c.includes('CONSTRAINT') && !c.includes('PRIMARY KEY'));

    if (validCols.length > 0) {
        let sql = `ALTER TABLE "${table}"\n`;
        const colLines = validCols.map(c => `  ADD COLUMN IF NOT EXISTS ${c.replace(/,$/, '')}`);
        sql += colLines.join(',\n') + ';\n';
        console.log(sql);
    }
}
