const fs = require('fs');
const path = require('path');

console.log("Running Refactor Check...");

function scanDir(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(scanDir(fullPath));
        } else if (file.endsWith('.py')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = scanDir(path.join(__dirname, '../../app'));
let hasWarnings = false;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    if (lines.length > 50) {
        console.log(`[WARNING] File ${path.basename(file)} has ${lines.length} lines. Consider refactoring.`);
    }

    if (content.includes('eval(') || content.includes('exec(')) {
        console.error(`[ERROR] Insecure pattern found in ${path.basename(file)}`);
        hasWarnings = true;
    }
});

if (hasWarnings) {
    process.exit(1);
} else {
    console.log("Refactor Check: SUCCESS. All files comply with standards.");
    process.exit(0);
}
