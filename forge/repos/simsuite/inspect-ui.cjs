/**
 * SimSuite UI Inspector — CDP-based DOM inspection
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const EXE = 'C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort\\src-tauri\\target\\debug\\bundle\\msi\\SimSuite.exe';
const PORT = 9223;
const APP_URL = `http://localhost:${PORT}`;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${APP_URL}${path}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    }).on('error', reject).setTimeout(6000);
  });
}

function cdpSend(ws, msg) {
  return new Promise((resolve, reject) => {
    const id = Date.now();
    const payload = JSON.stringify({ ...msg, id });
    ws.send(payload);
    const handler = (data) => {
      const r = JSON.parse(data);
      if (r.id === id) { ws.off('message', handler); resolve(r); }
    };
    ws.on('message', handler);
    setTimeout(() => { ws.off('message', handler); reject(new Error('CDP timeout')); }, 8000);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🔍 SimSuite UI Inspector\n');

  // Kill existing
  try { execSync(`taskkill /F /IM SimSuite.exe`, { stdio: 'ignore', windowsHide: true }); } catch {}
  await sleep(1500);

  // Launch
  console.log('🚀 Launching SimSuite...');
  spawn(EXE, [`--remote-debugging-port=${PORT}`], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  await sleep(7000);

  // Get CDP target
  let targets;
  try { targets = await httpGet('/json'); } catch { console.log('❌ Cannot connect to CDP'); process.exit(1); }
  if (!targets || targets.length === 0) { console.log('❌ No CDP targets'); process.exit(1); }

  const wsUrl = targets[0].webSocketDebuggerUrl;
  const wsMatch = wsUrl.match(/ws:\/\/([^:]+):(\d+)/);
  const ws = new WebSocket(`ws://${wsMatch[1]}:${wsMatch[2]}/`);
  await new Promise(r => ws.on('open', r));
  console.log('✅ Connected to CDP\n');

  // Inspect downloads-shell
  async function query(selector) {
    const r = await cdpSend(ws, {
      method: 'Runtime.evaluate',
      params: { expression: `document.querySelector('${selector}') ? document.querySelector('${selector}').tagName : 'NOT FOUND'`, returnByValue: true }
    });
    return r.result.result.value;
  }

  async function getComputed(selector, prop) {
    const r = await cdpSend(ws, {
      method: 'Runtime.evaluate',
      params: {
        expression: `window.getComputedStyle(document.querySelector('${selector}')).getPropertyValue('${prop}')`,
        returnByValue: true
      }
    });
    return r.result.result.value;
  }

  async function getBox(selector) {
    const r = await cdpSend(ws, {
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => { const el = document.querySelector('${selector}'); if (!el) return null; const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,tag:el.tagName,classes:el.className.substring(0,80)}; })()`,
        returnByValue: true
      }
    });
    return r.result.result.value;
  }

  // Check elements exist
  const checks = [
    '.downloads-shell',
    '.downloads-rail-shell',
    '.downloads-stage',
    '.downloads-lane-button',
    '.downloads-item-row',
    '.downloads-casual-drawer',
    '.downloads-casual-backdrop',
    '.downloads-top-strip',
  ];

  console.log('📦 Element presence:');
  for (const sel of checks) {
    const tag = await query(sel);
    console.log(`  ${sel}: ${tag === 'NOT FOUND' ? '❌ NOT FOUND' : '✅ ' + tag}`);
  }

  // Check drawer/backdrop visibility (should NOT be visible in standard mode)
  console.log('\n🎨 Drawer/Backdrop state (standard mode — should be hidden):');
  for (const sel of ['.downloads-casual-drawer', '.downloads-casual-backdrop']) {
    const tag = await query(sel);
    if (tag === 'NOT FOUND') {
      console.log(`  ${sel}: ✅ not in DOM`);
    } else {
      const vis = await getComputed(sel, 'display');
      const z = await getComputed(sel, 'z-index');
      const pos = await getComputed(sel, 'position');
      console.log(`  ${sel}: display=${vis}, z-index=${z}, position=${pos}`);
    }
  }

  // Check queue dock layout
  console.log('\n📐 Queue dock layout:');
  for (const sel of ['.downloads-queue-dock', '.downloads-stage', '.downloads-shell']) {
    const box = await getBox(sel);
    if (box) {
      console.log(`  ${sel}: ${JSON.stringify({x:Math.round(box.x),y:Math.round(box.y),w:Math.round(box.w),h:Math.round(box.h)})`);
    } else {
      console.log(`  ${sel}: not found`);
    }
  }

  // Check lane button clickability
  console.log('\n🖱️ Lane button check:');
  const laneCount = await query('.downloads-lane-button');
  console.log(`  Total lane buttons: ${laneCount}`);

  if (laneCount !== 'NOT FOUND' && parseInt(laneCount) > 0) {
    const firstBtn = await getBox('.downloads-lane-button');
    const stageBox = await getBox('.downloads-stage');
    console.log(`  First lane button: x=${Math.round(firstBtn?.x)}, y=${Math.round(firstBtn?.y)}, w=${Math.round(firstBtn?.w)}, h=${Math.round(firstBtn?.h)}`);
    console.log(`  Stage: x=${Math.round(stageBox?.x)}, y=${Math.round(stageBox?.y)}, w=${Math.round(stageBox?.w)}, h=${Math.round(stageBox?.h)}`);

    // Check if button is within stage
    if (firstBtn && stageBox) {
      const inside = firstBtn.x >= stageBox.x && firstBtn.y >= stageBox.y &&
                     firstBtn.x + firstBtn.w <= stageBox.x + stageBox.w &&
                     firstBtn.y + firstBtn.h <= stageBox.y + stageBox.h;
      console.log(`  Button within stage: ${inside ? '✅' : '❌ OVERLAPPING ISSUE'}`);
    }

    // Check pointer-events
    const pe = await getComputed('.downloads-lane-button', 'pointer-events');
    const vis = await getComputed('.downloads-lane-button', 'visibility');
    const op = await getComputed('.downloads-lane-button', 'opacity');
    console.log(`  pointer-events=${pe}, visibility=${vis}, opacity=${op}`);
  }

  // Try clicking a lane button
  console.log('\n🖱️ Attempting lane button click via CDP...');
  try {
    await cdpSend(ws, {
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => { const btns = document.querySelectorAll('.downloads-lane-button'); if (btns.length < 2) return 'no buttons'; btns[1].click(); return 'clicked: ' + btns[1].textContent.trim().substring(0,30); })()`,
        returnByValue: true
      }
    });
    await sleep(1000);
    const newActive = await cdpSend(ws, {
      method: 'Runtime.evaluate',
      params: { expression: `document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none'`, returnByValue: true }
    });
    console.log(`  Active lane after click: "${newActive.result.result.value}"`);
  } catch (e) {
    console.log(`  ❌ Click failed: ${e.message}`);
  }

  ws.close();
  try { execSync(`taskkill /F /IM SimSuite.exe`, { stdio: 'ignore', windowsHide: true }); } catch {}
  console.log('\n--- Done ---');
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  try { execSync(`taskkill /F /IM SimSuite.exe`, { stdio: 'ignore', windowsHide: true }); } catch {}
  process.exit(1);
});
