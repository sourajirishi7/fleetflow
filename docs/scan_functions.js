const fs = require('fs');
const path = require('path');

function extractFunctionRanges(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match function declarations: function name, async function name, exports.name = ...
    let fnMatch = line.match(/^(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/);
    if (!fnMatch) {
      fnMatch = line.match(/^(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(/);
    }
    if (!fnMatch) {
      fnMatch = line.match(/^exports\.([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:function\s*)?\(/);
    }
    if (!fnMatch) {
      fnMatch = line.match(/^(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?function/);
    }

    if (fnMatch) {
      const name = fnMatch[1];
      const startLine = i + 1;
      
      // Count braces to find end line
      let braceCount = 0;
      let foundFirstBrace = false;
      let endLine = startLine;

      for (let j = i; j < lines.length; j++) {
        const curLine = lines[j];
        for (let char of curLine) {
          if (char === '{') {
            braceCount++;
            foundFirstBrace = true;
          } else if (char === '}') {
            braceCount--;
          }
        }
        if (foundFirstBrace && braceCount === 0) {
          endLine = j + 1;
          break;
        }
      }
      results.push({ name, startLine, endLine });
    }
  }
  return results;
}

const jsFunctions = extractFunctionRanges(path.join(__dirname, '../script.js'));
console.log(`Found ${jsFunctions.length} functions in script.js:`);
console.log(JSON.stringify(jsFunctions.slice(0, 10), null, 2));
