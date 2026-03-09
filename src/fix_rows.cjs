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

    // 1. Remove "if (rowIndex === 0) return" (with or without semicolons, spaces, comments)
    // There are several forms: "if (rowIndex === 0) return;", "if (rowIndex === 0) return null;", "if (rowIndex === 0) return"
    content = content.replace(/if\s*\(\s*rowIndex\s*===\s*0\s*\)\s*return(\s*null)?\s*;?(\s*\/\/[^\n]*)?/g, '');

    // 2. Fix loops starting at 1 for data.table.rows
    // for (let i = 1; i < data.table.rows.length; i++) -> 0
    // for (let i = 1, len = rows.length; i < len; i++) -> 0
    // Keep an eye to not replace valid "i = 1" (like AssignTask.jsx 1 to 30)
    content = content.replace(/for\s*\(\s*let\s+i\s*=\s*1\s*(\s*,\s*len\s*=\s*rows\.length)?;\s*i\s*<\s*(data\.table\.rows\.length|len|rows\.length)\s*;/g, (match, g1, g2) => {
        return match.replace(/let\s+i\s*=\s*1/, 'let i = 0');
    });

    // 3. delegation-data.jsx .slice(1) on table rows
    content = content.replace(/data\.table\.rows\s*\n*\s*\.slice\(1\)/g, 'data.table.rows.slice(0)');
    // Admin backend fetch master has a similar logic:
    content = content.replace(/data\.table\.rows\s*\n*\s*\.slice\(1\)/g, 'data.table.rows');
    // For Dashboard-Multi.jsx fallback:
    content = content.replace(/fallbackData\.table\.rows\s*\n*\s*\.slice\(1\)/g, 'fallbackData.table.rows');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed:', path.basename(filePath));
        totalUpdated++;
    }
});

console.log('Total files fixed for row indexing:', totalUpdated);
