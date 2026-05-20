/**
 * Results page logic — renders scores, domain breakdown, and question review.
 */

document.addEventListener('DOMContentLoaded', () => {
  const results = JSON.parse(sessionStorage.getItem('quizResults'));
  if (!results) {
    window.location.href = 'index.html';
    return;
  }

  renderResults(results);

  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('results-main').classList.remove('hidden');
});

function renderResults(results) {
  // Score hero
  const scoreEl = document.getElementById('results-score');
  scoreEl.textContent = `${results.percentage}%`;
  scoreEl.classList.add(results.passed ? 'pass' : 'fail');

  document.getElementById('results-label').textContent =
    `${results.correct} of ${results.totalQuestions} correct`;

  const badge = document.getElementById('results-badge');
  badge.textContent = results.passed ? '✓ PASSED' : '✗ FAILED';
  badge.classList.add(results.passed ? 'pass' : 'fail');

  // Stats
  document.getElementById('stat-time').textContent = formatTime(results.timeTaken);
  document.getElementById('stat-correct').textContent = results.correct;
  document.getElementById('stat-incorrect').textContent = results.incorrect;

  // Domain breakdown
  renderDomainBreakdown(results.domainScores);

  // Question review
  renderQuestionReview(results.questionResults);
}

function renderDomainBreakdown(domainScores) {
  const tbody = document.getElementById('domain-tbody');
  tbody.innerHTML = '';

  for (const [name, data] of Object.entries(domainScores)) {
    const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
    const barClass = pct >= 75 ? 'good' : pct >= 50 ? 'ok' : 'bad';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${name}</td>
      <td>${data.correct}/${data.total} (${pct}%)</td>
      <td>
        <div class="domain-bar">
          <div class="domain-bar-fill ${barClass}" style="width: ${pct}%"></div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function renderQuestionReview(questionResults) {
  const container = document.getElementById('review-list');
  container.innerHTML = '';

  questionResults.forEach((qr, i) => {
    const div = document.createElement('div');
    const statusClass = qr.isCorrect ? 'correct' : qr.isTimedOut ? 'timeout' : 'incorrect';
    div.className = `review-item ${statusClass}`;

    const userAnswerText = qr.userAnswer.length > 0
      ? qr.userAnswer.map(k => {
          const opt = qr.options.find(o => o.key === k);
          return `${k}) ${opt ? opt.text : '?'}`;
        }).join('; ')
      : qr.isTimedOut ? 'Timeout — no answer' : 'No answer';

    const correctAnswerText = qr.correctAnswers.map(k => {
      const opt = qr.options.find(o => o.key === k);
      return `${k}) ${opt ? opt.text : '?'}`;
    }).join('; ');

    div.innerHTML = `
      <div class="review-question">${i + 1}. ${qr.question}</div>
      <div class="review-answers">
        <span><strong>Your answer:</strong> ${escapeHtml(userAnswerText)}</span>
        <span><strong>Correct:</strong> ${escapeHtml(correctAnswerText)}</span>
      </div>
      <div class="review-explanation">${escapeHtml(qr.explanation)}</div>
    `;

    container.appendChild(div);
  });
}

function formatTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Retake with same questions */
function retakeSame() {
  // Keep quizConfig, clear results
  sessionStorage.removeItem('quizResults');
  window.location.href = 'quiz.html';
}

/** Start a new quiz with different config */
function newQuiz() {
  sessionStorage.removeItem('quizConfig');
  sessionStorage.removeItem('quizResults');
  sessionStorage.removeItem('quizQuestions');
  window.location.href = 'index.html';
}

/** Back to setup */
function backToSetup() {
  sessionStorage.removeItem('quizResults');
  sessionStorage.removeItem('quizQuestions');
  window.location.href = 'index.html';
}
