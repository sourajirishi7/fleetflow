const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const checks = [];
function recordCheck(name, passed, detail) {
  checks.push({ name, passed, detail });
  console.log(`${passed ? '✅' : '❌'} ${name}: ${detail}`);
}

// 1. Confirm frontend.pdf exists
const frontendPdfExists = fs.existsSync(path.join(ROOT_DIR, 'frontend.pdf'));
const frontendSize = frontendPdfExists ? fs.statSync(path.join(ROOT_DIR, 'frontend.pdf')).size : 0;
recordCheck('Frontend PDF Exists', frontendPdfExists && frontendSize > 5000, `Size: ${(frontendSize / 1024).toFixed(1)} KB`);

// 2. Confirm backend.pdf exists
const backendPdfExists = fs.existsSync(path.join(ROOT_DIR, 'backend.pdf'));
const backendSize = backendPdfExists ? fs.statSync(path.join(ROOT_DIR, 'backend.pdf')).size : 0;
recordCheck('Backend PDF Exists', backendPdfExists && backendSize > 5000, `Size: ${(backendSize / 1024).toFixed(1)} KB`);

// 3. Verify valid PDF signature (%PDF-)
function checkPdfSignature(filePath) {
  const buf = Buffer.alloc(10);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, 10, 0);
  fs.closeSync(fd);
  return buf.toString('utf8').startsWith('%PDF-');
}
const validFrontendSignature = checkPdfSignature(path.join(ROOT_DIR, 'frontend.pdf'));
const validBackendSignature = checkPdfSignature(path.join(ROOT_DIR, 'backend.pdf'));
recordCheck('Valid PDF Headers', validFrontendSignature && validBackendSignature, 'Both files contain valid binary %PDF- magic signature');

// 4. Verify docs/FUNCTION_INDEX.json
const fnIndexExists = fs.existsSync(path.join(ROOT_DIR, 'docs/FUNCTION_INDEX.json'));
let fnIndex = null;
if (fnIndexExists) {
  fnIndex = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'docs/FUNCTION_INDEX.json'), 'utf8'));
}
recordCheck('Function Index JSON Exists', fnIndexExists && fnIndex.frontend.length > 0 && fnIndex.backend.length > 0, `Frontend fns: ${fnIndex?.frontend?.length}, Backend fns: ${fnIndex?.backend?.length}`);

// 5 & 6. Verify documented filenames exist & function line numbers are valid and non-negative
let allFilesExist = true;
let allLineNumbersValid = true;
let invalidLineDetails = [];

const allFunctions = [...(fnIndex?.frontend || []), ...(fnIndex?.backend || [])];
for (const fn of allFunctions) {
  const fullPath = path.join(ROOT_DIR, fn.file);
  if (!fs.existsSync(fullPath)) {
    allFilesExist = false;
    invalidLineDetails.push(`File missing: ${fn.file}`);
  } else {
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const totalLines = fileContent.split('\n').length;
    if (fn.startLine <= 0 || fn.endLine <= 0 || fn.startLine > fn.endLine || fn.endLine > totalLines) {
      allLineNumbersValid = false;
      invalidLineDetails.push(`Invalid line range in ${fn.file} for ${fn.name}: ${fn.startLine}-${fn.endLine} (total: ${totalLines})`);
    }
  }
}
recordCheck('Documented Files Exist', allFilesExist, 'All referenced files exist in workspace');
recordCheck('Function Line Numbers Valid', allLineNumbersValid, allLineNumbersValid ? `Verified ${allFunctions.length} function line ranges within source bounds` : invalidLineDetails.join(', '));

// 7. Verify zero leaked secrets in PDFs
const envContent = fs.readFileSync(path.join(ROOT_DIR, '.env'), 'utf8');
const secretsToSearch = [];
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    if (val && val.length > 6 && !['development', 'production', '5000', 'localhost', '127.0.0.1'].includes(val)) {
      secretsToSearch.push({ key, val });
    }
  }
});

let secretsLeaked = false;
let leakDetails = [];
for (const pdfFile of ['frontend.pdf', 'backend.pdf']) {
  const pdfBytes = fs.readFileSync(path.join(ROOT_DIR, pdfFile));
  for (const s of secretsToSearch) {
    if (pdfBytes.includes(Buffer.from(s.val))) {
      secretsLeaked = true;
      leakDetails.push(`Secret ${s.key} leaked in ${pdfFile}`);
    }
  }
}
recordCheck('Secrets Protection Verification', !secretsLeaked, secretsLeaked ? leakDetails.join(', ') : '0 sensitive secrets or passwords exposed in generated PDFs');

// Summary
console.log('\n=======================================================');
console.log(`VALIDATION SUMMARY: ${checks.filter(c => c.passed).length} / ${checks.length} CHECKS PASSED`);
console.log('=======================================================');
