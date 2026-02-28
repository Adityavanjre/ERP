const fs = require('fs');
const oldSql = fs.readFileSync('prisma/migrations/20260225235500_reversible_init/migration.sql', 'utf8');
const newSql = fs.readFileSync('current.sql', 'utf8');

// Super simple diff
const oldLines = oldSql.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'));
const newLines = newSql.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'));

const oldSet = new Set(oldLines);
const missing = newLines.filter(l => !oldSet.has(l) && !l.includes('subscriptionStatus') && !l.includes('planExpiresAt') && !l.includes('BillingEvent'));

console.log("Differences (New lines not in old SQL):");
missing.slice(0, 50).forEach(l => console.log(l));
