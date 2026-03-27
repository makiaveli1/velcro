const fs = require('fs');
const path = require('path');

const files = [
  'DownloadsScreen.tsx',
  'screens/downloads/DownloadsDecisionPanel.tsx',
  'screens/downloads/DownloadsQueuePanel.tsx',
  'screens/downloads/DownloadsRail.tsx',
];

const target = '/home/likwid/.openclaw/workspace/simsuite-review/src';

let allOk = true;
for (const f of files) {
  const src = fs.readFileSync(path.join(target, f), 'utf8');
  let depth = 0, max = 0, maxLine = 0, pos = 0;
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '{') { depth++; if (depth > max) { max = depth; maxLine = src.slice(0, i).split('\n').length; }} 
    if (src[i] === '}') depth--;
  }
  const lines = src.split('\n').length;
  const ok = depth === 0;
  if (!ok) allOk = false;
  console.log(ok ? '✅' : '❌', f, `- ${lines} lines, brace balance: ${depth}${ok ? '' : ' (max ' + max + ' at line ' + maxLine + ')'}`);
}

process.exit(allOk ? 0 : 1);
