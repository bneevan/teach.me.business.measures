document.querySelectorAll('[data-quiz]').forEach(quiz => {
  const feedback = quiz.querySelector('[role="status"]');
  quiz.querySelectorAll('button[data-correct]').forEach(button => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      quiz.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      const correct = button.dataset.correct === 'true';
      feedback.textContent = (correct ? 'Correct. ' : 'Not quite. ') + (correct ? quiz.dataset.explanation : quiz.dataset.hint);
    });
  });
});
