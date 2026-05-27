const fs = require('fs');
const path = require('path');

const replaceInFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    content = content.replace(/Hora AI/g, 'Phope');
    content = content.replace(/Hora Ai/g, 'Phope');
    content = content.replace(/hora-ai/g, 'phope');
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
