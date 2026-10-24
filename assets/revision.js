(() => {
  'use strict';
  const cards = window.revisionCards;
  const key = 'cedar-revision-v1';
  const day = 86400000;
  let state = {};
  let persistent = true;
  function valid(entry) {
    return entry && Number.isFinite(entry.due) && Number.isInteger(entry.streak) && entry.streak >= 0;
  }
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      cards.forEach(card => { if (valid(stored[card.id])) state[card.id] = stored[card.id]; });
    }
    localStorage.setItem(key, JSON.stringify(state));
  } catch { persistent = false; }
  const due = card => !state[card.id] || state[card.id].due <= Date.now();
  const status = document.querySelector('#storage-status');
  function storageNotice() {
    if (status) status.textContent = persistent
      ? 'Review dates are saved only in this browser. Local-file storage can vary by browser; keep using the same browser and path. Ratings are self-assessments, not proof of mastery.'
      : 'Browser storage is unavailable. You can practice now, but review dates will not survive a reload.';
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(state)); }
    catch { persistent = false; }
    storageNotice();
  }
  storageNotice();
  const count = document.querySelector('#due-count');
  if (count) count.textContent = `${cards.filter(due).length} of ${cards.length}`;
  if (!document.querySelector('#flashcard')) return;
  const question = document.querySelector('#question');
  const answer = document.querySelector('#answer');
  const reveal = document.querySelector('#reveal');
  const ratings = document.querySelector('#ratings');
  const progress = document.querySelector('#progress');
  const result = document.querySelector('#result');
  let queue = [];
  let total = 0;
  let reviewed = 0;
  function render() {
    answer.hidden = true;
    ratings.hidden = true;
    reveal.hidden = !queue.length;
    reveal.setAttribute('aria-expanded', 'false');
    progress.textContent = `${reviewed} reviewed · ${queue.length} remaining`;
    if (!queue.length) {
      question.textContent = total ? 'Review complete.' : 'Nothing due right now.';
      answer.textContent = '';
      return;
    }
    question.textContent = queue[0].question;
    answer.textContent = queue[0].answer;
  }
  function start(all) {
    queue = cards.filter(card => all || due(card)).slice();
    total = queue.length;
    reviewed = 0;
    result.textContent = all ? 'Practicing all cards. Ratings update their review dates.' : 'Reviewing new and due cards.';
    render();
  }
  reveal.addEventListener('click', () => {
    answer.hidden = false;
    ratings.hidden = false;
    reveal.hidden = true;
    reveal.setAttribute('aria-expanded', 'true');
    ratings.querySelector('button').focus();
  });
  ratings.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    if (answer.hidden || !queue.length) return;
    const card = queue.shift();
    const remembered = button.dataset.rating === 'remembered';
    const streak = remembered ? Math.min((state[card.id]?.streak || 0) + 1, 4) : 0;
    const interval = remembered ? [1, 3, 7, 14][streak - 1] * day : 10 * 60000;
    state[card.id] = { streak, due: Date.now() + interval };
    save();
    reviewed++;
    result.textContent = remembered
      ? `Scheduled again in ${interval / day} day(s).`
      : 'Scheduled again in 10 minutes. Re-read the explanation in the lesson if needed.';
    render();
    if (queue.length) reveal.focus();
    else document.querySelector('#review-due').focus();
  }));
  document.querySelector('#review-due').addEventListener('click', () => start(false));
  document.querySelector('#practice-all').addEventListener('click', () => start(true));
  start(false);
})();
