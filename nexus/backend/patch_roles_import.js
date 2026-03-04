const fs = require('fs');
const glob = require('glob');
const path = require('path');

const tsFiles = glob.sync('src/**/*.controller.ts', { cwd: __dirname });

tsFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Check if the file uses @Roles
    if (content.includes('@Roles(') && !content.includes('Roles } from') && !content.includes('Roles} from') && !content.match(/import\s+\{\s*([^}]*,\s*)?Roles(\s*,[^}]*)?\s*\}\s+from/)) {
        const lines = content.split('\n');

        // Calculate relative path to src/common/decorators/roles.decorator
        const dir = path.dirname(fullPath);
        const rolesDecoratorPath = path.resolve(__dirname, 'src/common/decorators/roles.decorator');
        let relativePath = path.relative(dir, rolesDecoratorPath).replace(/\\/g, '/');

        // Remove .ts extension
        relativePath = relativePath.replace(/\.ts$/, '');

        if (!relativePath.startsWith('.')) {
            relativePath = './' + relativePath;
        }

        // Insert import at the top
        const importLine = `import { Roles } from '${relativePath}';`;

        let lastImportIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ')) {
                lastImportIndex = i;
            }
        }

        lines.splice(lastImportIndex + 1, 0, importLine);
        fs.writeFileSync(fullPath, lines.join('\n'));
        console.log(`Added import { Roles } to ${file}`);
    }
});
