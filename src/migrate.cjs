const fs = require('fs');
const path = require('path');

console.log('Migration script started...');

const SHEET_ID = '1O07ebj7ht7tKqVjHjQPOJ90UETRLQwJ2SiIgE5Uqo4k';

function walk(dir, callback) {
    console.log('Walking dir:', dir);
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
console.log('Pages Dir:', pagesDir);

if (!fs.existsSync(pagesDir)) {
    console.error('Pages directory not found:', pagesDir);
    process.exit(1);
}

let totalUpdated = 0;

walk(pagesDir, (filePath) => {
    if (!filePath.endsWith('.jsx') && !filePath.endsWith('.tsx')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. SHEET_ID
    if (content.includes('APPS_SCRIPT_URL') && !content.includes('SHEET_ID:')) {
        if (content.includes('const CONFIG = {')) {
            content = content.replace('const CONFIG = {', `const CONFIG = {\n  SHEET_ID: "${SHEET_ID}",`);
        } else if (content.includes('const APPS_SCRIPT_URL =')) {
            content = content.replace('const APPS_SCRIPT_URL =', `const SHEET_ID = "${SHEET_ID}";\nconst APPS_SCRIPT_URL =`);
        }
    }

    // 2. Fetch URLs - more generic match
    content = content.replace(/fetch\(`\$\{CONFIG\.APPS_SCRIPT_URL\}\?sheet=\$\{CONFIG\.SHEET_NAME\}&action=fetch`\)/g,
        `fetch(\`https://docs.google.com/spreadsheets/d/\${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=\${encodeURIComponent(CONFIG.SHEET_NAME)}\`)`);

    content = content.replace(/fetch\(`\$\{APPS_SCRIPT_URL\}\?sheet=(.*?)&action=fetch`\)/g, (match, sheetName) => {
        return `fetch(\`https://docs.google.com/spreadsheets/d/\${typeof CONFIG !== 'undefined' ? CONFIG.SHEET_ID : (typeof SHEET_ID !== 'undefined' ? SHEET_ID : '1O07ebj7ht7tKqVjHjQPOJ90UETRLQwJ2SiIgE5Uqo4k')}/gviz/tq?tqx=out:json&sheet=\${encodeURIComponent(${sheetName.startsWith('$') ? sheetName.slice(2, -1) : sheetName})}\`)`;
    });

    content = content.replace(/fetch\(`https:\/\/script\.google\.com\/macros\/s\/.*?\/exec\/gviz\/tq\?tqx=out:json&sheet=(.*?)`\)/g, (match, sheetName) => {
        return `fetch(\`https://docs.google.com/spreadsheets/d/\${typeof CONFIG !== 'undefined' ? CONFIG.SHEET_ID : (typeof SHEET_ID !== 'undefined' ? SHEET_ID : '1O07ebj7ht7tKqVjHjQPOJ90UETRLQwJ2SiIgE5Uqo4k')}/gviz/tq?tqx=out:json&sheet=${sheetName}\`)`;
    });

    // 3. User checking session storage
    if (content.includes('sessionStorage.getItem("role")') && !content.includes('.toLowerCase()')) {
        content = content.replace(/const currentUserRole = sessionStorage\.getItem\("role"\)/g, 'const currentUserRole = String(sessionStorage.getItem("role") || "").toLowerCase()');
        content = content.replace(/const userRole = sessionStorage\.getItem\("role"\)/g, 'const userRole = String(sessionStorage.getItem("role") || "").toLowerCase()');
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('Updated:', filePath);
        totalUpdated++;
    }
});

console.log('Total files migrated:', totalUpdated);
