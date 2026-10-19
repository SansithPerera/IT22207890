'use strict';
// npm run export — writes a plain HTML/CSS copy of the site to ./export
// (folder + ZIP) for the SLIIT course web. Options:
//   --budget=20     size limit in MB (default 20, or EXPORT_BUDGET_MB)
//   --live=https://your-site.onrender.com   where large files are linked
const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const { createStore } = require('../src/store');
const { Content } = require('../src/content');
const { buildStaticSite } = require('../src/export');
const { createZip } = require('../src/lib/zip');
const { formatBytes } = require('../src/lib/util');

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=');

(async () => {
  const store = createStore();
  const content = new Content(store);
  await content.init();
  const budgetMb = Number(arg('budget')) || config.exportBudgetMb;
  const mode = arg('mode') || 'static';
  const { entries, report } = await buildStaticSite(content, { budgetMb, liveUrlFallback: arg('live'), mode, stripIndex: mode === 'preview' });
  const outDir = path.join(config.root, 'export', mode === 'preview' ? 'preview' : 'site');
  fs.rmSync(outDir, { recursive: true, force: true });
  for (const e of entries) {
    const file = path.join(outDir, e.name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, e.data);
  }
  const zipPath = path.join(config.root, 'export', mode === 'preview' ? 'preview.zip' : 'course-web-site.zip');
  fs.writeFileSync(zipPath, createZip(entries));
  console.log(report.text);
  console.log(`\nFolder: ${path.relative(config.root, outDir)}`);
  console.log(`ZIP:    ${path.relative(config.root, zipPath)} (${formatBytes(fs.statSync(zipPath).size)})`);
  await store.close();
})().catch((err) => { console.error(err); process.exit(1); });
