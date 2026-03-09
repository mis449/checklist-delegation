const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath, callback);
        } else {
            callback(path.join(dir, f));
        }
    });
}

const pagesDir = path.join(__dirname, 'pages');
let totalUpdated = 0;

walk(pagesDir, (filePath) => {
    if (!filePath.endsWith('.jsx') && !filePath.endsWith('.tsx')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Lowercase role fetching
    // Look for: const userRole = sessionStorage.getItem("role") or similar and ensure it has .toLowerCase() where applicable
    const patternsToFix = [
        /const (\w+Role) = sessionStorage\.getItem\(["']role["']\);?/g,
    ];

    patternsToFix.forEach(regex => {
        content = content.replace(regex, (match, p1) => {
            // Check if it's already using lowerCase in the same line or nearby. We can just replace it to be safe.
            return `const ${p1} = String(sessionStorage.getItem("role") || "").toLowerCase();`;
        });
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed role case:', path.basename(filePath));
        totalUpdated++;
    }
});

console.log('Total files fixed for role case:', totalUpdated);
