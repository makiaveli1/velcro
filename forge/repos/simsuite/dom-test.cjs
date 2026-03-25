/**
 * SimSuite DOM Test - Pure Node.js spawn approach
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const pw = require('/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort/node_modules/playwright');

const EXE_WSL = '/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort/src-tauri/target/debug/simsuite.exe';
const PORT = 9255;
const APP_URL = `http://localhost:${PORT}`;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${APP_URL}${path}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    req.setTimeout(8000);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('SimSuite DOM Test\n');

  // Kill existing
  try { execSync('taskkill /F /IM simsuite.exe', { windowsHide: true }); } catch {}
  await sleep(2000);

  // Launch with env var
  console.log('Launching SimSuite (port', PORT, ')...');
  const env = { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` };
  const child = spawn(EXE_WSL, [`--remote-debugging-port=${PORT}`], {
    detached: true,
    stdio: 'ignore',
    env
  });
  child.unref();
  console.log('PID:', child.pid);

  // Wait for CDP
  let cdpReady = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    try {
      const targets = await httpGet('/json');
      if (targets && targets.length > 0) {
        console.log('CDP ready after', i + 1, 's');
        cdpReady = true;
        break;
      }
    } catch {}
    process.stdout.write('.');
  }
  console.log('');

  if (!cdpReady) {
    console.log('CDP not available');
    try { execSync('taskkill /F /IM simsuite.exe', { windowsHide: true }); } catch {}
    process.exit(1);
  }

  // Get WS URL
  const targets = await httpGet('/json');
  const wsUrl = targets[0].webSocketDebuggerUrl;
  console.log('WS URL:', wsUrl.substring(0, 60), '\n');

  const wsMatch = wsUrl.match(/ws:\/\/([^:]+):(\d+)/);
  const wsFullUrl = `ws://${wsMatch[1]}:${wsMatch[2]}/`;

  let browser;
  try {
    browser = await pw.chromium.connectOverCDP(wsFullUrl);
    const page = browser.contexts()[0].pages()[0];
    await page.bringToFront();
    await sleep(3000);

    // DOM inspection
    const report = await page.evaluate(() => {
      const r = {};
      const selectors = [
        '.downloads-shell', '.downloads-rail-shell', '.downloads-stage',
        '.downloads-lane-button', '.downloads-item-row',
        '.downloads-casual-drawer', '.downloads-casual-backdrop',
        '.downloads-top-strip', '.downloads-stage-split',
        '.downloads-queue-dock',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!el) { r[sel] = { found: false }; continue; }
        const s = window.getComputedStyle(el);
        const box = el.getBoundingClientRect();
        r[sel] = {
          found: true,
          display: s.display, visibility: s.visibility,
          opacity: s.opacity, pointerEvents: s.pointerEvents,
          zIndex: s.zIndex, position: s.position,
          w: Math.round(box.width), h: Math.round(box.height),
          x: Math.round(box.left), y: Math.round(box.top),
        };
      }
      r._laneCount = document.querySelectorAll('.downloads-lane-button').length;
      r._activeBefore = document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none';
      r._queueCount = document.querySelectorAll('.downloads-item-row').length;
      return r;
    });

    console.log('DOM Results:\n');
    let issues = 0;
    for (const [sel, d] of Object.entries(report)) {
      if (sel.startsWith('_')) continue;
      if (!d.found) { console.log('  NOT_FOUND: ' + sel); issues++; continue; }
      const p = [];
      if (d.display === 'none') p.push('display:none');
      if (d.visibility === 'hidden') p.push('visibility:hidden');
      if (d.opacity === '0') p.push('opacity:0');
      if (d.pointerEvents === 'none') p.push('pointer-events:none');
      const icon = p.length > 0 ? 'WARN: ' + p.join(',') : 'OK';
      console.log('  ' + icon + ': ' + sel + ' (' + d.w + 'x' + d.h + ' at ' + d.x + ',' + d.y + ')');
      issues += p.length;
    }
    console.log('\nLane buttons: ' + report._laneCount);
    console.log('Queue items: ' + report._queueCount);
    console.log('Active lane: ' + report._activeBefore);

    // Click test
    console.log('\nClick test:');
    const cr = await page.evaluate(() => {
      const btns = document.querySelectorAll('.downloads-lane-button');
      if (btns.length < 2) return { error: 'only ' + btns.length + ' button(s)' };
      const before = document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none';
      btns[1].click();
      return { clicked: btns[1].textContent.trim().substring(0, 40), before };
    });
    if (cr.error) { console.log('  FAIL: ' + cr.error); issues++; }
    else {
      console.log('  Clicked: ' + cr.clicked);
      await sleep(1500);
      const after = await page.evaluate(() =>
        document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none'
      );
      const changed = after !== cr.before;
      console.log('  Active after: ' + after);
      console.log(changed ? '  OK: Lane changed ' + cr.before + ' -> ' + after : '  FAIL: Lane unchanged (was ' + cr.before + ')');
      if (!changed) issues++;
    }

    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await sleep(2000);
    console.log('\nConsole errors: ' + errors.length);
    if (errors.length > 0) { errors.slice(0, 3).forEach(e => console.log('  ERROR: ' + e.substring(0, 200))); issues++; }

    await browser.close();
    console.log('\n' + (issues === 0 ? 'ALL CHECKS PASSED' : issues + ' issue(s) found'));

  } catch (err) {
    console.log('Error:', err.message);
    if (browser) await browser.close().catch(() => {});
    process.exit(1);
  }

  try { execSync('taskkill /F /IM simsuite.exe', { windowsHide: true }); } catch {}
}

main().catch(e => {
  console.error('Fatal:', e.message);
  try { execSync('taskkill /F /IM simsuite.exe', { windowsHide: true }); } catch {}
  process.exit(1);
});
