import fs from 'fs';
import path from 'path';

const dirs = [
  'e:/00.1_DenD3v_AI/phopephum-v2/apps/web/app',
  'e:/00.1_DenD3v_AI/phopephum-v2/apps/mobile/app'
];

const targetColor = /#8A8070/gi;
const replacementColor = '#C6B79F';

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (stat.isFile() && /\.(tsx|ts|css|js|jsx)$/.test(file)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (targetColor.test(content)) {
        console.log(`Replacing color in: ${fullPath}`);
        content = content.replace(targetColor, replacementColor);
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    console.log(`Starting replacement in: ${dir}`);
    walkDir(dir);
  } else {
    console.log(`Directory does not exist: ${dir}`);
  }
}
console.log('Replacement complete!');
