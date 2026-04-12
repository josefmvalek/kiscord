const fs = require('fs');
const path = 'c:/Users/Pocitac/Desktop/Projekty/kiscord/js/modules/regenerace.js';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

// From scout: 
// Zinc ends at index 127 (line 128)
// Magnesium starts at index 137 (line 138)
const zincEndLine = 127;
const magnesiumStartLine = 137;

console.log('Lines to remove:');
for (let i = zincEndLine + 3; i < magnesiumStartLine; i++) {
    console.log(`${i}: ${lines[i]}`);
}

const newLines = [
    ...lines.slice(0, zincEndLine + 3),
    ...lines.slice(magnesiumStartLine)
];

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('Successfully cleaned up garbage between Zinc and Magnesium sections');
