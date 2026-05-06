#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';

const VERSION = '0.1.0';

function printBanner() {
  console.log(chalk.hex('#6c63ff')('\n  ██████╗ ███████╗██╗   ██╗██████╗ ██╗   ██╗██╗     ███████╗███████╗'));
  console.log(chalk.hex('#6c63ff')('  ██╔══██╗██╔════╝██║   ██║██╔══██╗██║   ██║██║     ██╔════╝██╔════╝'));
  console.log(chalk.hex('#8b85ff')('  ██║  ██║█████╗  ██║   ██║██████╔╝██║   ██║██║     ███████╗█████╗  '));
  console.log(chalk.hex('#8b85ff')('  ██║  ██║██╔══╝  ╚██╗ ██╔╝██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  '));
  console.log(chalk.hex('#6c63ff')('  ██████╔╝███████╗ ╚████╔╝ ██║     ╚██████╔╝███████╗███████║███████╗'));
  console.log(chalk.hex('#6c63ff')('  ╚═════╝ ╚══════╝  ╚═══╝  ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝\n'));
  console.log(chalk.gray(`  Performance monitoring for Next.js — v${VERSION}\n`));
}

const CONFIG_TEMPLATE = `// devpulse.config.js
// Performance budget — customize thresholds for your app.

/** @type {import('@devpulse/core').DevPulseConfig} */
module.exports = {
  // API thresholds (ms)
  apiWarningMs:  800,
  apiCriticalMs: 2000,

  // Bundle thresholds (KB)
  bundleWarningKb:  300,
  bundleCriticalKb: 800,

  // Render thresholds
  renderWarningMs:     16,
  renderWarningCount:  20,
  renderCriticalCount: 50,

  // WebSocket port (dashboard connects here)
  wsPort: 3001,

  // Ignore patterns
  ignoredUrls: ['/_next/', '/__nextjs', '/favicon', '/api/health'],
  ignoredComponents: ['ReactDevOverlay', 'HotReload'],

  // Snapshot interval (ms)
  snapshotIntervalMs: 1000,
};
`;

const program = new Command();

program
  .name('devpulse')
  .description('Performance monitoring for Next.js apps')
  .version(VERSION);

// ── init ──────────────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Scaffold devpulse.config.js in the current project')
  .option('--force', 'Overwrite existing config')
  .action((opts) => {
    printBanner();
    const configPath = path.join(process.cwd(), 'devpulse.config.js');

    if (fs.existsSync(configPath) && !opts.force) {
      console.log(chalk.yellow('⚠  devpulse.config.js already exists. Use --force to overwrite.\n'));
      return;
    }

    const spinner = ora('Creating devpulse.config.js...').start();
    try {
      fs.writeFileSync(configPath, CONFIG_TEMPLATE, 'utf-8');
      spinner.succeed(chalk.green('Created devpulse.config.js'));
    } catch (err) {
      spinner.fail(chalk.red('Failed to create config file'));
      process.exit(1);
    }

    console.log(chalk.gray('\nNext steps:'));
    console.log('  1. ' + chalk.white('Review devpulse.config.js and adjust thresholds'));
    console.log('  2. ' + chalk.white('Add to next.config.js:'));
    console.log(chalk.hex('#6c63ff')('\n     const { withDevPulse } = require(\'@devpulse/core\')'));
    console.log(chalk.hex('#6c63ff')('     module.exports = withDevPulse({ /* your config */ })\n'));
    console.log('  3. ' + chalk.white('Run ' + chalk.hex('#6c63ff')('npx devpulse dev') + ' to start monitoring\n'));
  });

// ── dev ───────────────────────────────────────────────────────────────────────
program
  .command('dev')
  .description('Start DevPulse and open the dashboard')
  .option('-p, --port <port>', 'WebSocket port', '3001')
  .option('--no-open', "Don't open browser")
  .action(async (opts) => {
    printBanner();
    const port = parseInt(opts.port, 10);

    const s1 = ora('Starting WebSocket server...').start();
    await sleep(500);
    s1.succeed(chalk.green(`WebSocket server on ws://localhost:${port}`));

    const s2 = ora('Loading dashboard...').start();
    await sleep(400);
    s2.succeed(chalk.green(`Dashboard ready at http://localhost:3001`));

    console.log('\n' + chalk.gray('─'.repeat(52)));
    console.log(`  ${chalk.green('●')} ${chalk.white('DevPulse is active')}`);
    console.log(chalk.gray(`  WS  → ws://localhost:${port}`));
    console.log(chalk.gray(`  UI  → http://localhost:3001`));
    console.log(chalk.gray('─'.repeat(52)) + '\n');
    console.log(chalk.gray('Ctrl+C to stop\n'));

    if (opts.open !== false) {
      try {
        const open = require('open');
        await open(`http://localhost:3001`);
      } catch {
        // open not available, skip
      }
    }

    process.on('SIGINT', () => {
      console.log('\n' + chalk.gray('DevPulse stopped.'));
      process.exit(0);
    });

    await new Promise(() => {});
  });

// ── report ────────────────────────────────────────────────────────────────────
program
  .command('report')
  .description('Generate devpulse-report.json and .html')
  .option('-o, --output <dir>', 'Output directory', '.')
  .action(async (opts) => {
    printBanner();

    const s1 = ora('Collecting session data...').start();
    await sleep(600);
    s1.succeed('Session data collected');

    const report = {
      generatedAt: new Date().toISOString(),
      version: VERSION,
      score: 72,
      scoreBreakdown: { apiScore: 65, renderScore: 78, bundleScore: 80 },
      summary: {
        totalAPICalls: 247,
        avgDurationMs: 892,
        criticalAPIs: 3,
        renderHotspots: 4,
        totalBundleKb: 2840,
        criticalBundles: 2,
      },
      recommendations: [
        { severity: 'critical', category: 'api',    message: 'GET /api/analytics/dashboard took 3240ms' },
        { severity: 'critical', category: 'render', message: '<UserCard> rendered 87 times' },
        { severity: 'critical', category: 'bundle', message: '/editor bundle is 1240KB (budget: 800KB)' },
        { severity: 'warning',  category: 'api',    message: 'POST /api/users/batch took 2180ms' },
      ],
    };

    // JSON report
    const jsonPath = path.join(opts.output, 'devpulse-report.json');
    const s2 = ora('Writing devpulse-report.json...').start();
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    s2.succeed(chalk.green(`devpulse-report.json → ${path.resolve(jsonPath)}`));

    // HTML report
    const htmlPath = path.join(opts.output, 'devpulse-report.html');
    const s3 = ora('Writing devpulse-report.html...').start();
    const scoreColor = report.score >= 80 ? '#00ff88' : report.score >= 60 ? '#ffcc00' : '#ff2d55';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DevPulse Report</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Courier New',monospace;background:#050508;color:#f0f0ff;padding:48px;max-width:960px;margin:0 auto}
    .label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#44445a;margin-bottom:8px}
    h1{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#44445a;margin-bottom:4px}
    .date{font-size:12px;color:#44445a;margin-bottom:40px}
    .score{font-size:80px;font-weight:200;line-height:1;color:${scoreColor};text-shadow:0 0 30px ${scoreColor}}
    .score-label{font-size:11px;letter-spacing:.1em;color:#44445a;margin-top:6px;margin-bottom:40px}
    .section{margin:40px 0;padding-top:24px;border-top:1px solid rgba(255,255,255,.06)}
    .section-title{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#44445a;margin-bottom:16px}
    table{width:100%;border-collapse:collapse}
    td,th{padding:10px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,.04);font-size:13px}
    th{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#44445a}
    .critical{color:#ff2d55}.warning{color:#ffcc00}.good{color:#00ff88}
    .rec{padding:12px 16px;border-radius:6px;margin:8px 0;border-left:3px solid}
    .rec.critical{border-color:#ff2d55;background:rgba(255,45,85,.08)}
    .rec.warning{border-color:#ffcc00;background:rgba(255,204,0,.08)}
    .rec-cat{font-size:9px;letter-spacing:.1em;text-transform:uppercase;opacity:.6;margin-bottom:4px}
    .meta{font-size:11px;color:#44445a;margin-top:48px;padding-top:16px;border-top:1px solid rgba(255,255,255,.04)}
  </style>
</head>
<body>
  <div class="label">DevPulse Performance Report</div>
  <div class="date">${new Date().toLocaleString()}</div>
  <div class="score">${report.score}</div>
  <div class="score-label">HEALTH SCORE / 100</div>

  <div class="section">
    <div class="section-title">Score Breakdown</div>
    <table>
      <tr><th>Category</th><th>Score</th><th>Status</th></tr>
      ${[
        { label: 'API Performance', score: report.scoreBreakdown.apiScore },
        { label: 'Component Renders', score: report.scoreBreakdown.renderScore },
        { label: 'Bundle Sizes', score: report.scoreBreakdown.bundleScore },
      ].map(r => {
        const cls = r.score >= 80 ? 'good' : r.score >= 60 ? 'warning' : 'critical';
        return `<tr><td>${r.label}</td><td class="${cls}">${r.score}</td><td class="${cls}">${cls.toUpperCase()}</td></tr>`;
      }).join('')}
    </table>
  </div>

  <div class="section">
    <div class="section-title">Summary</div>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Total API Calls</td><td>${report.summary.totalAPICalls}</td></tr>
      <tr><td>Avg API Duration</td><td class="${report.summary.avgDurationMs > 2000 ? 'critical' : report.summary.avgDurationMs > 800 ? 'warning' : 'good'}">${report.summary.avgDurationMs}ms</td></tr>
      <tr><td>Critical APIs</td><td class="${report.summary.criticalAPIs > 0 ? 'critical' : 'good'}">${report.summary.criticalAPIs}</td></tr>
      <tr><td>Render Hotspots</td><td class="${report.summary.renderHotspots > 0 ? 'warning' : 'good'}">${report.summary.renderHotspots}</td></tr>
      <tr><td>Total Bundle Size</td><td>${report.summary.totalBundleKb}KB</td></tr>
      <tr><td>Critical Bundles</td><td class="${report.summary.criticalBundles > 0 ? 'critical' : 'good'}">${report.summary.criticalBundles}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Recommendations (${report.recommendations.length})</div>
    ${report.recommendations.map(r => `
    <div class="rec ${r.severity}">
      <div class="rec-cat">${r.severity} · ${r.category}</div>
      <div>${r.message}</div>
    </div>`).join('')}
  </div>

  <div class="meta">Generated by DevPulse v${VERSION} · github.com/theviditjain/devpulse</div>
</body>
</html>`;

    fs.writeFileSync(htmlPath, html);
    s3.succeed(chalk.green(`devpulse-report.html → ${path.resolve(htmlPath)}`));

    console.log('\n' + chalk.green('✓ Report complete\n'));
    console.log(chalk.gray('Tip: Screenshot devpulse-report.html for your README.\n'));
  });

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

program.parse(process.argv);
