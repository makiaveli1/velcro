#!/usr/bin/env node
// Daily CRM Automation Cron
// Run: node cron/daily.js
// Recommended: schedule via cron at 8:30 AM daily
//
// Cron example:
//   30 8 * * * cd /home/likwid/.openclaw/workspace/ventures/website-studio/CRM && node cron/daily.js >> logs/daily.log 2>&1
//
// Or use OpenClaw's built-in cron:
//   openclaw cron add --name "CRM Daily" --schedule "30 8 * * 1-5" ...

const path = require('path');

// Set working directory to CRM root
process.chdir(path.join(__dirname, '..'));

const daily = require('../services/daily');
const discovery = require('../services/discovery');
const messaging = require('../adapters/messaging');

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const quietHours = args.includes('--quiet-hours');
  const noNotify = args.includes('--no-notify');

  console.log(`[cron] Daily CRM run starting at ${new Date().toISOString()}`);
  console.log(`[cron] Options: dryRun=${dryRun}, quietHours=${quietHours}, noNotify=${noNotify}`);

  try {
    const digest = await daily.runDailyDigest({
      dryRun,
      quietHours,
      sendNotification: !noNotify,
    });

    console.log(`[cron] Digest lines:`);
    digest.lines.forEach(line => console.log(`  ${line}`));

    if (digest.sections?.discovery?.success === false) {
      console.warn(`[cron] Discovery scan failed: ${digest.sections.discovery.error}`);
    }

    console.log(`[cron] Run complete in ${digest.durationMs}ms`);
    process.exit(0);
  } catch (err) {
    console.error(`[cron] Fatal error:`, err);
    process.exit(1);
  }
}

main();
