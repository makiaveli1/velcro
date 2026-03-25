/**
 * SimSuite DOM Inspector v3 — WS URL passed as argument
 * Usage: node test-dom3.cjs <webSocketDebuggerUrl>
 */

const pw = require('playwright');

const wsUrl = process.argv[2];
if (!wsUrl) { console.error('Usage: node test-dom3.cjs <wsUrl>'); process.exit(1); }

function extractWs(url) {
  const m = url.match(/ws:\/\/([^:]+):(\d+)/);
  return m ? `ws://${m[1]}:${m[2]}/` : null;
}

const wsFullUrl = extractWs(wsUrl);
if (!wsFullUrl) { console.error('❌ Invalid WS URL:', wsUrl); process.exit(1); }

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🔍 SimSuite DOM Inspector\n');
  console.log('   WS URL:', wsFullUrl.substring(0, 70), '\n');

  let browser;
  try {
    browser = await pw.chromium.connectOverCDP(wsFullUrl);
    const page = browser.contexts()[0].pages()[0];
    await page.bringToFront();
    await sleep(3000);

    // Full DOM inspection
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

    console.log('📊 DOM Results:\n');
    let issueCount = 0;
    for (const [sel, d] of Object.entries(report)) {
      if (sel.startsWith('_')) continue;
      if (!d.found) { console.log(`  ❌ ${sel}: NOT FOUND`); issueCount++; continue; }
      const issues = [];
      if (d.display === 'none') issues.push('display:none');
      if (d.visibility === 'hidden') issues.push('visibility:hidden');
      if (d.opacity === '0') issues.push('opacity:0');
      if (d.pointerEvents === 'none') issues.push('pointer-events:none');
      const icon = issues.length > 0 ? '⚠️  ' + issues.join(', ') : '✅';
      console.log(`  ${sel}: ${icon}`);
      console.log(`    geometry: ${d.w}x${d.h} at (${d.x},${d.y}) z=${d.zIndex} pos=${d.position}`);
      if (issues.length > 0) issueCount++;
    }
    console.log(`\n  Lane buttons: ${report._laneCount}`);
    console.log(`  Queue items: ${report._queueCount}`);
    console.log(`  Active lane: "${report._activeBefore}"`);

    // Click test
    console.log('\n🖱️  Lane button click test:');
    const cr = await page.evaluate(() => {
      const btns = document.querySelectorAll('.downloads-lane-button');
      if (btns.length < 2) return { error: `only ${btns.length} button(s)` };
      const before = document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none';
      btns[1].click();
      return { clicked: btns[1].textContent.trim().substring(0, 40), before };
    });
    if (cr.error) { console.log(`  ❌ ${cr.error}`); }
    else {
      console.log(`  Clicked: "${cr.clicked}"`);
      await sleep(1500);
      const after = await page.evaluate(() =>
        document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none'
      );
      const changed = after !== cr.before;
      console.log(`  Active after: "${after}"`);
      console.log(changed
        ? `  ✅ SUCCESS: Lane changed "${cr.before}" → "${after}"`
        : `  ❌ FAILED: Lane unchanged (was "${cr.before}", still "${after}")`);
      if (!changed) issueCount++;
    }

    // Console errors
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await sleep(2000);
    console.log('\n📋 Console errors:');
    if (errors.length === 0) console.log('  ✅ None');
    else { errors.slice(0, 5).forEach(e => console.log('  ❌', e.substring(0, 200))); issueCount++; }

    await browser.close();

    console.log(`\n${issueCount === 0 ? '✅ All checks passed' : `⚠️  ${issueCount} issue(s) found`}`);
    process.exit(issueCount > 0 ? 1 : 0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (browser) await browser.close().catch(() => {});
    process.exit(1);
  }
}

main();
