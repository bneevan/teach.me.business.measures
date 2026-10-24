// Dependency-free behavioral smoke tests: node tests/revision.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function boot({ blocked = false, initial = '{}' } = {}) {
  const elements = {};
  function el() {
    return { hidden: false, textContent: '', dataset: {}, handlers: {},
      setAttribute() {}, focus() {},
      addEventListener(event, fn) { this.handlers[event] = fn; },
      click() { this.handlers.click(); }
    };
  }
  ['storage-status', 'due-count', 'flashcard', 'question', 'answer', 'reveal', 'ratings', 'progress', 'result', 'review-due', 'practice-all'].forEach(id => elements[id] = el());
  const again = el(), good = el();
  again.dataset.rating = 'again'; good.dataset.rating = 'remembered';
  elements.ratings.querySelectorAll = () => [again, good];
  elements.ratings.querySelector = () => again;
  let stored = initial;
  const context = vm.createContext({ window: {}, Date, console,
    document: { querySelector: selector => elements[selector.slice(1)] || null },
    localStorage: {
      getItem() { if (blocked) throw Error('blocked'); return stored; },
      setItem(k, value) { if (blocked) throw Error('blocked'); stored = value; }
    }
  });
  for (const file of ['revision-data.js', 'revision.js']) vm.runInContext(fs.readFileSync(`assets/${file}`, 'utf8'), context);
  return { elements, again, good, count: context.window.revisionCards.length, state: () => JSON.parse(stored) };
}
const app = boot();
assert.equal(app.elements['due-count'].textContent, `${app.count} of ${app.count}`);
assert.equal(app.elements.answer.hidden, true);
app.good.click(); // Hidden rating must not advance a card.
assert.match(app.elements.progress.textContent, /^0 reviewed/);
app.elements.reveal.click();
assert.equal(app.elements.answer.hidden, false);
app.good.click();
assert.equal(app.state()['revenue-timing'].streak, 1);
assert.ok(Math.abs(app.state()['revenue-timing'].due - Date.now() - 86400000) < 1000);
assert.equal(app.elements.answer.hidden, true);
app.elements.reveal.click(); app.again.click();
assert.ok(Math.abs(app.state()['profit-vs-cash'].due - Date.now() - 600000) < 1000);
for (let i = 0; i < app.count - 2; i++) { app.elements.reveal.click(); app.good.click(); }
assert.equal(app.elements.question.textContent, 'Review complete.');
app.elements['review-due'].click();
assert.equal(app.elements.question.textContent, 'Nothing due right now.');
app.elements['practice-all'].click();
assert.equal(app.elements.progress.textContent, `0 reviewed · ${app.count} remaining`);
const reloaded = boot({ initial: JSON.stringify(app.state()) });
assert.equal(reloaded.elements['due-count'].textContent, `0 of ${app.count}`);
assert.equal(reloaded.elements.question.textContent, 'Nothing due right now.');
const blocked = boot({ blocked: true });
assert.match(blocked.elements['storage-status'].textContent, /unavailable/);
blocked.elements.reveal.click(); blocked.good.click();
assert.match(blocked.elements.progress.textContent, /^1 reviewed/);
assert.equal(boot({ initial: 'broken JSON' }).elements['due-count'].textContent, `${app.count} of ${app.count}`);
assert.equal(boot({ initial: '{"revenue-timing":{"due":"bad","streak":-1}}' }).elements['due-count'].textContent, `${app.count} of ${app.count}`);
console.log('Revision smoke tests passed: recall, ratings, scheduling, completion, reload, invalid and unavailable storage.');
