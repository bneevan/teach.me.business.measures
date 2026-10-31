// Dependency-free smoke tests: node tests/glossary.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// 1. Verify glossary-data.js
const context = vm.createContext({ window: {} });
const dataCode = fs.readFileSync(path.join(__dirname, '../assets/glossary-data.js'), 'utf8');
vm.runInContext(dataCode, context);

const terms = context.window.glossaryTerms;
assert.ok(Array.isArray(terms), 'glossaryTerms should be an array');
assert.equal(terms.length, 39, 'Expected 39 glossary terms');
assert.equal(context.window.glossaryPauseDuration, 5.0, 'Pause duration should be 5 seconds');
assert.ok(context.window.glossaryTotalDuration > 700, 'Total audio duration should be ~743s');

// Verify timestamps and pause
for (let i = 0; i < terms.length; i++) {
  const t = terms[i];
  assert.ok(t.id, `Term ${i} missing id`);
  assert.ok(t.name, `Term ${i} missing name`);
  assert.ok(t.category, `Term ${i} missing category`);
  assert.ok(t.department, `Term ${i} missing department`);
  assert.ok(t.explanation, `Term ${i} missing explanation`);
  assert.ok(t.formula, `Term ${i} missing formula`);
  assert.ok(t.spoken, `Term ${i} missing spoken text`);
  assert.ok(typeof t.audio_start === 'number' && t.audio_start >= 0, `Term ${i} invalid audio_start`);
  assert.ok(typeof t.audio_end === 'number' && t.audio_end > t.audio_start, `Term ${i} invalid audio_end`);
  
  if (i > 0) {
    const prev = terms[i - 1];
    const pause = t.audio_start - prev.audio_end;
    assert.ok(Math.abs(pause - 5.0) < 0.1, `Pause between term ${i-1} and ${i} should be 5.0s, got ${pause}`);
  }
}

// 2. Verify audio files
const masterAudioPath = path.join(__dirname, '../assets/audio/glossary-complete.mp3');
assert.ok(fs.existsSync(masterAudioPath), 'Master audio file must exist');
const stats = fs.statSync(masterAudioPath);
assert.ok(stats.size > 1000000, 'Master audio file must be substantial (>1MB)');

// 3. Verify glossary.html structure
const html = fs.readFileSync(path.join(__dirname, '../glossary.html'), 'utf8');
assert.ok(html.includes('id="glossaryAudio"'), 'Audio element must be present in HTML');
assert.ok(html.includes('id="mainPlayBtn"'), 'Play button must be present in HTML');
assert.ok(html.includes('id="termSelect"'), 'Term selector dropdown must be present in HTML');
assert.ok(html.includes('id="pauseCountdown"'), 'Pause countdown element must be present in HTML');
assert.ok(html.includes('assets/glossary-data.js'), 'Must script-tag glossary-data.js');

// 4. Verify all HTML files have Google Tag and Consistent Header
function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && item !== 'node_modules' && !item.startsWith('.')) {
      results = results.concat(getHtmlFiles(full));
    } else if (item.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const allPages = getHtmlFiles(path.join(__dirname, '..'));
assert.ok(allPages.length >= 28, `Expected at least 28 HTML pages, found ${allPages.length}`);
for (const p of allPages) {
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('G-GY0KGRL32C'), `${p} missing Google Tag G-GY0KGRL32C`);
  assert.ok(content.includes('<header class="site-header">'), `${p} missing consistent site-header`);
  assert.ok(!/href=["'][^"']+\.md["']/.test(content), `${p} still contains link to .md file`);
}

console.log(`Glossary smoke tests passed: 39 terms, 5s pauses verified, audio assets present, HTML structure valid, and all ${allPages.length} HTML pages verified with consistent header & Google tag.`);
