/**
 * App.js — Setup screen logic for index.html
 */

document.addEventListener('DOMContentLoaded', () => {
  renderQuestionSets();
  setupModeToggle();
  setupTimerConfig();
  loadHistory();
});

/** Render question set checkboxes */
function renderQuestionSets() {
  const container = document.getElementById('question-sets');
  container.innerHTML = '';

  QUESTION_SETS.forEach(set => {
    const div = document.createElement('label');
    div.className = 'checkbox-item';

    div.innerHTML = `
      <input type="checkbox" class="set-checkbox" value="${set.id}" checked>
      <label>${set.name}</label>
      <span class="set-count" data-set-id="${set.id}">loading...</span>
    `;

    div.querySelector('input').addEventListener('change', updateTotalCount);
    container.appendChild(div);
  });

  // Load question counts
  loadQuestionCounts();

  // Select All checkbox
  document.getElementById('select-all').addEventListener('change', (e) => {
    document.querySelectorAll('.set-checkbox').forEach(cb => {
      cb.checked = e.target.checked;
    });
    updateTotalCount();
  });
}

async function loadQuestionCounts() {
  let total = 0;
  for (const set of QUESTION_SETS) {
    try {
      const resp = await fetch(set.file);
      if (resp.ok) {
        const data = await resp.json();
        const count = data.questions.length;
        const el = document.querySelector(`.set-count[data-set-id="${set.id}"]`);
        if (el) el.textContent = `${count} questions`;
        total += count;
      }
    } catch (e) {
      const el = document.querySelector(`.set-count[data-set-id="${set.id}"]`);
      if (el) el.textContent = 'unavailable';
    }
  }
  document.getElementById('total-questions-label').textContent = `Total: ${total} questions available`;
}

function updateTotalCount() {
  // Recalculate from displayed counts
  let total = 0;
  document.querySelectorAll('.set-checkbox:checked').forEach(cb => {
    const countEl = document.querySelector(`.set-count[data-set-id="${cb.value}"]`);
    if (countEl) {
      const match = countEl.textContent.match(/(\d+)/);
      if (match) total += parseInt(match[1]);
    }
  });
  document.getElementById('total-questions-label').textContent = `Total: ${total} questions selected`;
}

/** Mode toggle */
function setupModeToggle() {
  const toggleBtns = document.querySelectorAll('#mode-toggle .toggle-option');
  const desc = document.getElementById('mode-description');

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.dataset.mode;
      if (mode === 'practice') {
        desc.textContent = 'Get immediate feedback and explanations after each question.';
        // Default timer for practice: per-question
        document.getElementById('timer-mode').value = 'per-question';
        document.getElementById('timer-value').value = '90';
        updateTimerLabel();
      } else {
        desc.textContent = 'Answer all questions first, then review your results at the end — like the real exam.';
        // Default timer for exam: overall
        document.getElementById('timer-mode').value = 'overall';
        document.getElementById('timer-value').value = '115';
        updateTimerLabel();
      }
    });
  });
}

/** Timer configuration */
function setupTimerConfig() {
  document.getElementById('timer-mode').addEventListener('change', updateTimerLabel);
  updateTimerLabel();
}

function updateTimerLabel() {
  const mode = document.getElementById('timer-mode').value;
  const valueGroup = document.getElementById('timer-value-group');
  const label = document.getElementById('timer-value-label');

  if (mode === 'none') {
    valueGroup.classList.add('hidden');
  } else {
    valueGroup.classList.remove('hidden');
    if (mode === 'per-question') {
      label.textContent = 'Seconds per question';
    } else {
      label.textContent = 'Total minutes';
    }
  }
}

/** Start quiz */
function startQuiz() {
  const selectedSets = Array.from(document.querySelectorAll('.set-checkbox:checked')).map(cb => cb.value);

  if (selectedSets.length === 0) {
    alert('Please select at least one question set.');
    return;
  }

  const mode = document.querySelector('#mode-toggle .toggle-option.active').dataset.mode;
  const timerMode = document.getElementById('timer-mode').value;
  const timerValue = document.getElementById('timer-value').value;
  const questionCount = document.getElementById('question-count').value;
  const shuffle = document.getElementById('shuffle-questions').checked;

  const config = {
    setIds: selectedSets,
    mode: mode,
    timerMode: timerMode,
    timerValue: timerValue,
    questionCount: questionCount,
    shuffle: shuffle
  };

  sessionStorage.setItem('quizConfig', JSON.stringify(config));
  window.location.href = 'quiz.html';
}

/** History */
function toggleHistory() {
  const panel = document.getElementById('history-panel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    loadHistory();
    panel.scrollIntoView({ behavior: 'smooth' });
  }
}

function loadHistory() {
  const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  const content = document.getElementById('history-content');

  if (history.length === 0) {
    content.innerHTML = '<p class="text-muted text-sm">No quiz history yet. Complete a quiz to see your results here.</p>';
    return;
  }

  const rows = history.slice().reverse().map((h, i) => {
    const d = new Date(h.date);
    const date = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const time = Timer.format(h.timeTaken);
    const passClass = h.passed ? 'pass' : 'fail';
    return `<tr>
      <td>${date}</td>
      <td>${h.mode === 'practice' ? '📖' : '📝'} ${h.mode}</td>
      <td>${h.correct}/${h.totalQuestions}</td>
      <td style="color:var(--${h.passed ? 'success' : 'danger'}); font-weight:700;">${h.percentage}%</td>
      <td>${time}</td>
    </tr>`;
  }).join('');

  content.innerHTML = `
    <table class="history-table">
      <thead><tr><th>Date</th><th>Mode</th><th>Score</th><th>%</th><th>Time</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function clearHistory() {
  if (confirm('Clear all quiz history?')) {
    localStorage.removeItem('quizHistory');
    loadHistory();
  }
}
