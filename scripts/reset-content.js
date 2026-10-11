'use strict';
// npm run reset-content -- --yes
// Replaces all pages, members, milestones, documents, presentations and the
// gallery with the starter content from the PP2 presentation.
// Uploaded files are kept (see the media library); messages are cleared.
const { createStore } = require('../src/store');
const { Content } = require('../src/content');

(async () => {
  if (!process.argv.includes('--yes')) {
    console.log('This replaces ALL site content with the starter content.');
    console.log('Run again with --yes to confirm:  npm run reset-content -- --yes');
    process.exit(1);
  }
  const store = createStore();
  const content = new Content(store);
  await content.init({ seed: false });
  await content.resetToSeed();
  console.log(`Content reset (${store.info().label}).`);
  await store.close();
})().catch((err) => { console.error(err); process.exit(1); });
