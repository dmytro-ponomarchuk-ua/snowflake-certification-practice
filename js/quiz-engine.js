/**
 * Quiz Engine — core state machine for the quiz.
 * Manages question navigation, answer collection, scoring, and timer coordination.
 */

let quizState = null;
let timer = null;

function initQuiz() {
  const config = JSON.parse(sessionStorage.getItem('quizConfig'));
  if (!config) {
    window.location.href = 'index.html';
    return;
  }

  const setIds = config.setIds;
  const count = config.questionCount === 'all' ? 'all' : parseInt(config.questionCount);
  const shuffle = config.shuffle;

  prepareQuestions(setIds, count, shuffle).then(({ questions, setsMeta, totalAvailable }) => {
    quizState = {
      config: config,
      questions: questions,
      currentIndex: 0,
      answers: {},        // questionId -> [selectedKeys]
      flagged: new Set(),
      timedOut: new Set(),
      submitted: {},      // questionId -> true (for practice mode per-question submission)
      startTime: Date.now(),
      endTime: null,
      totalQuestions: questions.length
    };

    sessionStorage.setItem('quizQuestions', JSON.stringify(questions));

    // Hide loading, show quiz
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('quiz-main').classList.remove('hidden');

    // Setup timer
    setupTimer();

    // Setup keyboard shortcuts
    setupKeyboard();

    // Show/hide mode-specific buttons
    updateModeButtons();

    // Build navigator grid
    buildNavigatorGrid();

    // Render first question
    renderCurrentQuestion();
  }).catch(err => {
    document.getElementById('loading-screen').innerHTML =
      `<p style="color:var(--danger);">Error loading questions: ${err.message}</p>
       <p class="text-sm text-muted mt-8">Make sure you're serving the app via an HTTP server (e.g., Live Server).</p>
       <button class="btn btn-outline mt-16" onclick="window.location.href='index.html'">Back to Setup</button>`;
  });
}

let timerPaused = false;

function togglePause() {
  if (!timer || quizState.config.timerMode === 'none') return;
  const btn = document.getElementById('pause-btn');
  const timerEl = document.getElementById('quiz-timer');

  if (timerPaused) {
    timer.resume();
    timerPaused = false;
    btn.innerHTML = '\u23F8';
    btn.title = 'Pause timer';
    btn.classList.remove('paused');
    timerEl.classList.remove('paused');
  } else {
    timer.pause();
    timerPaused = true;
    btn.innerHTML = '\u25B6';
    btn.title = 'Resume timer';
    btn.classList.add('paused');
    timerEl.classList.add('paused');
  }
}

function setupTimer() {
  const config = quizState.config;
  timer = new Timer();
  timerPaused = false;

  if (config.timerMode === 'none') {
    document.getElementById('quiz-timer').classList.add('hidden');
    document.getElementById('pause-btn').classList.add('hidden');
    return;
  }

  if (config.timerMode === 'overall') {
    const totalSeconds = parseInt(config.timerValue) * 60;
    timer.start(totalSeconds, onTimerTick, onTimerExpire);
  } else if (config.timerMode === 'per-question') {
    startPerQuestionTimer();
  }
}

function startPerQuestionTimer() {
  const seconds = parseInt(quizState.config.timerValue);
  timer.start(seconds, onTimerTick, onPerQuestionExpire);
}

function onTimerTick(remaining) {
  const display = document.getElementById('timer-display');
  const container = document.getElementById('quiz-timer');
  display.textContent = Timer.format(remaining);

  // Warning at < 60s for overall, < 10s for per-question
  const warnThreshold = quizState.config.timerMode === 'overall' ? 60 : 10;
  const dangerThreshold = quizState.config.timerMode === 'overall' ? 30 : 5;

  container.classList.remove('warning', 'danger');
  if (remaining <= dangerThreshold) {
    container.classList.add('danger');
  } else if (remaining <= warnThreshold) {
    container.classList.add('warning');
  }
}

function onTimerExpire() {
  // Overall timer expired — auto-submit exam
  if (quizState.config.mode === 'exam') {
    submitExam();
  } else {
    // In practice mode with overall timer, just stop
    quizState.endTime = Date.now();
    finishQuiz();
  }
}

function onPerQuestionExpire() {
  // Auto-advance to next question when per-question timer expires
  const qId = quizState.questions[quizState.currentIndex].id;

  if (!quizState.submitted[qId]) {
    quizState.timedOut.add(qId);
  }

  if (quizState.config.mode === 'practice' && !quizState.submitted[qId]) {
    // Auto-submit current answer in practice mode
    submitAnswer();
  }

  // Move to next if not last
  if (quizState.currentIndex < quizState.totalQuestions - 1) {
    setTimeout(() => navigateQuestion(1), 1500);
  }
}

function updateModeButtons() {
  const isPractice = quizState.config.mode === 'practice';
  const submitAnswerBtn = document.getElementById('submit-answer-btn');
  const submitExamBtn = document.getElementById('submit-exam-btn');

  if (isPractice) {
    submitAnswerBtn.classList.remove('hidden');
  }
  // Exam submit button visibility handled in renderCurrentQuestion
}

function renderCurrentQuestion() {
  const q = quizState.questions[quizState.currentIndex];
  const idx = quizState.currentIndex;
  const total = quizState.totalQuestions;
  const isPractice = quizState.config.mode === 'practice';
  const isSubmitted = quizState.submitted[q.id];

  // Update header
  document.getElementById('progress-text').textContent = `Question ${idx + 1} of ${total}`;
  document.getElementById('domain-badge').textContent = q.domainShort || q.domain;
  document.getElementById('progress-bar').style.width = `${((idx + 1) / total) * 100}%`;

  // Question info
  document.getElementById('question-number').textContent = `Question ${idx + 1}`;
  document.getElementById('question-text').textContent = q.question;

  // Multi-select hint
  const hintEl = document.getElementById('question-hint');
  if (q.multiSelect && q.correctAnswers) {
    hintEl.textContent = `Choose ${q.correctAnswers.length} answers`;
    hintEl.classList.remove('hidden');
  } else {
    hintEl.classList.add('hidden');
  }

  // Render options
  const optionsList = document.getElementById('options-list');
  optionsList.innerHTML = '';
  const userAnswers = quizState.answers[q.id] || [];

  q.options.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'option-item';
    div.dataset.key = opt.key;

    const isSelected = userAnswers.includes(opt.key);
    if (isSelected) div.classList.add('selected');

    // If submitted in practice mode, show correct/incorrect
    if (isSubmitted) {
      div.classList.add('disabled');
      const isCorrect = q.correctAnswers.includes(opt.key);
      if (isCorrect) {
        div.classList.add('correct');
      } else if (isSelected && !isCorrect) {
        div.classList.add('incorrect');
      }
    }

    const keySpan = document.createElement('span');
    keySpan.className = 'option-key';
    keySpan.textContent = opt.key;

    const textSpan = document.createElement('span');
    textSpan.className = 'option-text';
    textSpan.textContent = opt.text;

    div.appendChild(keySpan);
    div.appendChild(textSpan);

    // Add result icon if submitted
    if (isSubmitted) {
      const icon = document.createElement('span');
      icon.className = 'option-icon';
      const isCorrect = q.correctAnswers.includes(opt.key);
      if (isCorrect) {
        icon.textContent = '✓';
        icon.style.color = 'var(--success)';
      } else if (isSelected) {
        icon.textContent = '✗';
        icon.style.color = 'var(--danger)';
      }
      div.appendChild(icon);
    }

    if (!isSubmitted) {
      div.addEventListener('click', () => selectOption(q, opt.key, div));
    }

    optionsList.appendChild(div);
  });

  // Explanation panel
  const expPanel = document.getElementById('explanation-panel');
  const expTitle = document.getElementById('explanation-title');
  const expText = document.getElementById('explanation-text');

  if (isSubmitted && isPractice) {
    const answeredCorrectly = arraysEqual(userAnswers.sort(), [...q.correctAnswers].sort());
    const isTimedOut = quizState.timedOut.has(q.id) && !answeredCorrectly;
    const panelClass = answeredCorrectly ? 'correct-answer' : isTimedOut ? 'timeout-answer' : 'incorrect-answer';
    expPanel.className = 'explanation-panel visible ' + panelClass;
    expTitle.textContent = answeredCorrectly ? '✓ Correct!' : isTimedOut ? '⏱ Timeout' : '✗ Incorrect';
    expText.textContent = q.explanation;
  } else {
    expPanel.className = 'explanation-panel';
  }

  // Submit answer button visibility (practice mode)
  if (isPractice) {
    const submitBtn = document.getElementById('submit-answer-btn');
    if (isSubmitted) {
      submitBtn.classList.add('hidden');
    } else {
      submitBtn.classList.remove('hidden');
      submitBtn.disabled = false;
    }
  }

  // Exam submit button (show on last question)
  if (quizState.config.mode === 'exam') {
    const submitExamBtn = document.getElementById('submit-exam-btn');
    submitExamBtn.classList.toggle('hidden', idx !== total - 1);
  }

  // Prev/Next buttons
  document.getElementById('prev-btn').disabled = idx === 0;
  const nextBtn = document.getElementById('next-btn');
  if (idx === total - 1) {
    nextBtn.classList.add('hidden');
  } else {
    nextBtn.classList.remove('hidden');
  }

  // Flag button state
  const flagBtn = document.getElementById('flag-btn');
  flagBtn.classList.toggle('flagged', quizState.flagged.has(q.id));

  // Update navigator
  updateNavigatorGrid();

  // Reset per-question timer
  if (quizState.config.timerMode === 'per-question' && !isSubmitted) {
    startPerQuestionTimer();
  }
}

function selectOption(question, key, element) {
  if (quizState.submitted[question.id]) return;

  const current = quizState.answers[question.id] || [];

  if (question.multiSelect) {
    // Toggle checkbox style
    if (current.includes(key)) {
      quizState.answers[question.id] = current.filter(k => k !== key);
    } else {
      quizState.answers[question.id] = [...current, key];
    }
  } else {
    // Single select — replace
    quizState.answers[question.id] = [key];
  }

  // Re-render options styling
  const optionItems = document.querySelectorAll('.option-item');
  const selected = quizState.answers[question.id] || [];
  optionItems.forEach(item => {
    item.classList.toggle('selected', selected.includes(item.dataset.key));
  });

  updateNavigatorGrid();
}

function submitAnswer() {
  const q = quizState.questions[quizState.currentIndex];
  if (quizState.submitted[q.id]) return;

  quizState.submitted[q.id] = true;

  // Pause per-question timer if active
  if (quizState.config.timerMode === 'per-question' && timer) {
    timer.pause();
  }

  // Re-render to show feedback
  renderCurrentQuestion();
}

function navigateQuestion(direction) {
  const newIndex = quizState.currentIndex + direction;
  if (newIndex < 0 || newIndex >= quizState.totalQuestions) return;

  quizState.currentIndex = newIndex;
  renderCurrentQuestion();

  // Scroll to top of question
  document.getElementById('question-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goToQuestion(index) {
  if (index < 0 || index >= quizState.totalQuestions) return;
  quizState.currentIndex = index;
  renderCurrentQuestion();
  document.getElementById('question-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleFlag() {
  const q = quizState.questions[quizState.currentIndex];
  if (quizState.flagged.has(q.id)) {
    quizState.flagged.delete(q.id);
  } else {
    quizState.flagged.add(q.id);
  }
  document.getElementById('flag-btn').classList.toggle('flagged', quizState.flagged.has(q.id));
  updateNavigatorGrid();
}

function buildNavigatorGrid() {
  const grid = document.getElementById('navigator-grid');
  grid.innerHTML = '';
  for (let i = 0; i < quizState.totalQuestions; i++) {
    const cell = document.createElement('div');
    cell.className = 'nav-cell';
    cell.textContent = i + 1;
    cell.addEventListener('click', () => goToQuestion(i));
    grid.appendChild(cell);
  }
}

function updateNavigatorGrid() {
  const cells = document.querySelectorAll('.nav-cell');
  cells.forEach((cell, i) => {
    const q = quizState.questions[i];
    cell.className = 'nav-cell';

    if (i === quizState.currentIndex) cell.classList.add('current');

    if (quizState.submitted[q.id]) {
      const userAnswer = quizState.answers[q.id] || [];
      const isCorrect = arraysEqual([...userAnswer].sort(), [...q.correctAnswers].sort());
      const isTimedOut = quizState.timedOut.has(q.id) && !isCorrect;
      cell.classList.add(isCorrect ? 'correct-review' : isTimedOut ? 'timeout-review' : 'incorrect-review');
    } else if (quizState.flagged.has(q.id)) {
      cell.classList.add('flagged');
    } else if (quizState.answers[q.id] && quizState.answers[q.id].length > 0) {
      cell.classList.add('answered');
    }
  });
}

function confirmSubmitExam() {
  const answered = Object.keys(quizState.answers).filter(id => quizState.answers[id].length > 0).length;
  document.getElementById('submit-modal-text').textContent =
    `You have answered ${answered} of ${quizState.totalQuestions} questions. Are you sure you want to submit?`;
  document.getElementById('submit-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('submit-modal').classList.add('hidden');
}

function submitExam() {
  closeModal();
  quizState.endTime = Date.now();
  if (timer) timer.stop();
  finishQuiz();
}

function confirmEndQuiz() {
  document.getElementById('end-modal').classList.remove('hidden');
}

function closeEndModal() {
  document.getElementById('end-modal').classList.add('hidden');
}

function endQuiz() {
  closeEndModal();
  quizState.endTime = Date.now();
  if (timer) timer.stop();
  finishQuiz();
}

function finishQuiz() {
  // Calculate results
  const results = calculateResults();
  sessionStorage.setItem('quizResults', JSON.stringify(results));

  // Save to history in localStorage
  saveToHistory(results);

  // Navigate to results page
  window.location.href = 'results.html';
}

function calculateResults() {
  let correct = 0;
  let incorrect = 0;
  const domainScores = {};
  const questionResults = [];

  quizState.questions.forEach(q => {
    const userAnswer = quizState.answers[q.id] || [];
    const isCorrect = arraysEqual([...userAnswer].sort(), [...q.correctAnswers].sort());

    if (isCorrect) correct++;
    else incorrect++;

    // Domain tracking
    const domain = q.domainShort || q.domain;
    if (!domainScores[domain]) {
      domainScores[domain] = { total: 0, correct: 0, domain: q.domain };
    }
    domainScores[domain].total++;
    if (isCorrect) domainScores[domain].correct++;

    const isTimedOut = quizState.timedOut.has(q.id) && !isCorrect;

    questionResults.push({
      id: q.id,
      question: q.question,
      options: q.options,
      userAnswer: userAnswer,
      correctAnswers: q.correctAnswers,
      isCorrect: isCorrect,
      isTimedOut: isTimedOut,
      explanation: q.explanation,
      domain: domain
    });
  });

  const elapsed = quizState.endTime
    ? Math.round((quizState.endTime - quizState.startTime) / 1000)
    : Math.round((Date.now() - quizState.startTime) / 1000);

  return {
    totalQuestions: quizState.totalQuestions,
    correct: correct,
    incorrect: incorrect,
    percentage: Math.round((correct / quizState.totalQuestions) * 100),
    passed: (correct / quizState.totalQuestions) >= 0.75,
    timeTaken: elapsed,
    domainScores: domainScores,
    questionResults: questionResults,
    mode: quizState.config.mode,
    date: new Date().toISOString()
  };
}

function saveToHistory(results) {
  const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  history.push({
    date: results.date,
    mode: results.mode,
    totalQuestions: results.totalQuestions,
    correct: results.correct,
    percentage: results.percentage,
    passed: results.passed,
    timeTaken: results.timeTaken
  });
  // Keep last 50 entries
  if (history.length > 50) history.splice(0, history.length - 50);
  localStorage.setItem('quizHistory', JSON.stringify(history));
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Don't capture if modal is open
    if (!document.getElementById('submit-modal').classList.contains('hidden')) return;
    if (!document.getElementById('end-modal').classList.contains('hidden')) return;

    const q = quizState.questions[quizState.currentIndex];

    // Number keys 1-9 or A-E to select options
    if (!quizState.submitted[q.id]) {
      const keyMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E',
                       'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'e': 'E' };
      const optionKey = keyMap[e.key.toLowerCase()];
      if (optionKey) {
        const opt = q.options.find(o => o.key === optionKey);
        if (opt) {
          const el = document.querySelector(`.option-item[data-key="${optionKey}"]`);
          if (el) selectOption(q, optionKey, el);
        }
        return;
      }
    }

    // Enter to submit answer (practice mode)
    if (e.key === 'Enter' && quizState.config.mode === 'practice' && !quizState.submitted[q.id]) {
      submitAnswer();
      return;
    }

    // Arrow keys for navigation
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      navigateQuestion(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      navigateQuestion(-1);
    }

    // F key to flag
    if (e.key === 'f' || e.key === 'F') {
      toggleFlag();
    }
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initQuiz);
