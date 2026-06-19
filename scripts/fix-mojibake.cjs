/**
 * Fix double-encoded UTF-8 mojibake (Arabic saved via wrong Windows encoding).
 * Pattern: UTF-8 bytes were read as Latin-1 and re-saved as UTF-8.
 */
function fixMojibake(text) {
  if (!/[\u00C0-\u00FF]/.test(text) || !/[\u0600-\u06FF]/.test(text)) return text;
  try {
    const bytes = Buffer.from(text, 'latin1');
    const decoded = bytes.toString('utf8');
    if (/[\u0600-\u06FF]/.test(decoded) && !/[\u00C2-\u00FF]{2,}[\u0600-\u06FF]/.test(decoded)) {
      return decoded;
    }
  } catch {
    // keep original
  }
  return text;
}

function fixFile(relPath) {
  const fs = require('fs');
  const path = require('path');
  const p = path.join(process.cwd(), relPath);
  const orig = fs.readFileSync(p, 'utf8');
  const lines = orig.split(/\r?\n/);
  let changed = 0;
  const fixed = lines.map((line) => {
    const next = line.replace(/(['"`])([^'"`]*)\1/g, (full, q, inner) => {
      if (!/[\u0600-\u06FF\u00C0-\u00FF]/.test(inner)) return full;
      const repaired = fixMojibake(inner);
      if (repaired !== inner) changed++;
      return q + repaired + q;
    });
    return next;
  });
  if (changed > 0) {
    fs.writeFileSync(p, fixed.join('\n'), 'utf8');
    console.log('fixed', relPath, changed, 'strings');
  }
  return changed;
}

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error('Usage: node scripts/fix-mojibake.cjs <file...>');
  process.exit(1);
}

let total = 0;
for (const t of targets) total += fixFile(t);
console.log('total strings fixed:', total);
