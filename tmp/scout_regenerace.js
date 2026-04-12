const fs = require('fs');
const path = 'c:/Users/Pocitac/Desktop/Projekty/kiscord/js/modules/regenerace.js';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

// Find the end of zinc (around line 130)
let zincEndIndex = -1;
for (let i = 100; i < 200; i++) {
    if (lines[i] && lines[i].includes('id: 10') && lines[i].includes('Rostlinná strava')) {
        zincEndIndex = i;
    }
}

// Find the start of the REAL magnesium section
let magnesiumStartIndex = -1;
for (let i = zincEndIndex + 1; i < lines.length; i++) {
    if (lines[i] && lines[i].includes('supplementId: "magnesium"') && lines[i+1] && lines[i+1].includes('title: "VĚDECKÁ DATA: Hořčík')) {
        magnesiumStartIndex = i-1; // Should include the opening brace {
        break;
    }
}

if (zincEndIndex !== -1 && magnesiumStartIndex !== -1) {
    console.log(`Zinc ends at index ${zincEndIndex}: ${lines[zincEndIndex]}`);
    console.log(`Magnesium starts at index ${magnesiumStartIndex}: ${lines[magnesiumStartIndex]}`);
    
    // The content between zincEndIndex and magnesiumStartIndex is garbage
    const beforeGarbage = lines.slice(0, zincEndIndex + 3); // id: 10, ], }
    // Wait, let's be precise.
    // lines[zincEndIndex] is the id: 10 line.
    // lines[zincEndIndex + 1] should be ]
    // lines[zincEndIndex + 2] should be }
    
    console.log('Line +1:', lines[zincEndIndex + 1]);
    console.log('Line +2:', lines[zincEndIndex + 2]);
    
    // I'll take lines up to zincEndIndex + 3 and from magnesiumStartIndex
    const newLines = [
        ...lines.slice(0, zincEndIndex + 3),
        ...lines.slice(magnesiumStartIndex)
    ];
    
    // fs.writeFileSync(path, newLines.join('\n'), 'utf8');
    // console.log('Fixed the corruption!');
} else {
    console.log('Could not find indices', { zincEndIndex, magnesiumStartIndex });
}
