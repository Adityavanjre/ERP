
import fs from 'fs';
import path from 'path';

const BANNED_TERMS = [
  'Collective', 'Artifact', 'Transmission', 'Uplink', 'Protocol',
  'Initialize', 'Telemetry', 'Sector', 'Neural', 'Manifest',
  'Sequence', 'Modulation', 'Access Portal', 'Provisioning', 'Initiate',
  'System Core', 'Predictive Core', 'Scout Status', 'Zero-Trust'
];

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const TARGET_DIRS = [
  'd:/code/ERP/agency/client/src',
  'd:/code/ERP/nexus/frontend/src'
];

function scanDirectory(dir: string) {
  let results: string[] = [];
  
  if (!fs.existsSync(dir)) {
      console.log(`Directory not found: ${dir}`);
      return [];
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        results = results.concat(scanDirectory(fullPath));
      }
    } else {
      // Only check text files
      if (/\.(tsx|ts|js|jsx|html|css|json)$/.test(file)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const term of BANNED_TERMS) {
          if (content.includes(term)) {
            // Context snippet
            const index = content.indexOf(term);
            const snippet = content.substring(Math.max(0, index - 20), Math.min(content.length, index + term.length + 20));
            results.push(`MATCH: [${term}] in ${fullPath}\n   Snippet: "...${snippet.replace(/\n/g, ' ')}..."`);
          }
        }
      }
    }
  }
  return results;
}

console.log('--- STARTING FILE-BY-FILE AUDIT ---');
const allIssues = TARGET_DIRS.flatMap(dir => scanDirectory(dir));

if (allIssues.length === 0) {
  console.log('✅ PASSED: No banned terms found in any source file.');
} else {
  console.log(`❌ FAILED: Found ${allIssues.length} issues.`);
  console.log(allIssues.join('\n\n'));
}
console.log('--- AUDIT COMPLETE ---');
