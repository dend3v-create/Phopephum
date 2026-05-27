const fs = require('fs');
const path = require('path');

const replaceInFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    content = content.replace(/\bPhope\b/g, 'Phopephum');
    content = content.replace(/\bphope\b/g, 'phopephum');
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated: ' + filePath);
    }
};

const walkSync = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!['node_modules', '.next', '.git'].includes(file)) {
                walkSync(fullPath);
            }
        } else {
            if (/\.(md|ts|tsx|json|html)$/.test(file)) {
                replaceInFile(fullPath);
            }
        }
    }
};

walkSync('.');
