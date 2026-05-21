# AGENTS.md

## Project Overview

SnowPro Core Certification Practice Exam Quiz — a vanilla HTML/CSS/JavaScript static web app for practicing Snowflake COF-C02 certification questions. 488 questions across 5 exam-aligned domains + 1 bonus set. No frameworks, no build tools, no npm.

## Serving the App

Requires an HTTP server (fetch API won't work with `file://`):

```sh
cd web-app
python -m http.server 5500
```

Then open `http://localhost:5500/index.html`.

## Architecture

Three-page static app with global scripts (no module system):

| Page | Purpose |
|------|---------|
| `index.html` | Setup: set selection, mode, timer, question count |
| `quiz.html` | Quiz: question display, answer selection, navigation |
| `results.html` | Results: score, domain breakdown, question review |

State passes between pages via **sessionStorage** (quiz config, questions). History persists in **localStorage**.

### JavaScript Files

| File | Responsibility |
|------|---------------|
| `js/app.js` | Setup screen logic, loads question counts, starts quiz |
| `js/quiz-engine.js` | **Core state machine**: rendering, selection, submission, scoring, keyboard shortcuts |
| `js/question-loader.js` | Fetch JSON sets, merge, shuffle (Fisher-Yates), pro-rata distribution |
| `js/timer.js` | Timer class with per-question and overall modes, pause/resume |
| `js/results.js` | Results rendering, domain breakdown, history save |
| `js/ui.js` | Minimal — reserved for future UI utilities |

### Quiz State Object (in quiz-engine.js)

```javascript
quizState = {
  config,           // from sessionStorage
  questions,        // merged/shuffled/sliced array
  currentIndex,     // current question index
  answers: {},      // questionId → [selectedKeys]
  flagged: Set,     // flagged question IDs
  timedOut: Set,    // timed-out question IDs
  submitted: {},    // questionId → true (practice mode per-question)
  startTime, endTime
}
```

### Question Sets (in `data/*.json`)

| Set File | Domain | Weight | Questions |
|----------|--------|--------|----------|
| `set1-architecture.json` | Snowflake AI Data Cloud Features & Architecture | 31% | 100 |
| `set2-account-governance.json` | Account Management and Data Governance | 20% | 135 |
| `set3-data-loading.json` | Data Loading, Unloading, and Connectivity | 18% | 72 |
| `set4-performance-querying.json` | Performance Optimization, Querying, and Transformation | 21% | 140 |
| `set5-data-collaboration.json` | Data Collaboration | 10% | 41 |
| `set7-practice-exam.json` | SnowPro Core Practice Exam (bonus) | 0% | 25 |

### Question Data Schema

```json
{
  "setId": "set1-architecture",
  "setName": "Snowflake AI Data Cloud Features & Architecture",
  "domain": "...",
  "domainWeight": 31,
  "questions": [{
    "id": "s1q001",
    "question": "...",
    "options": [{ "key": "A", "text": "..." }],
    "correctAnswers": ["A"],
    "multiSelect": false,
    "explanation": "...",
    "difficulty": "easy|medium|hard"
  }]
}
```

## CSS Conventions

- CSS variables defined in `:root` — use them (e.g., `var(--primary)`, `var(--success)`, `var(--danger)`)
- Brand color: `--primary: #29B5E8` (Snowflake blue)
- Component naming: `.option-item`, `.question-card`, `.nav-cell` — semantic, not BEM
- State modifiers: `.selected`, `.correct`, `.incorrect`, `.disabled`, `.flagged`
- Utility classes: `.hidden`, `.mt-8`, `.text-sm`
- Responsive breakpoints: 640px and 480px

## Quiz Modes

| Mode | Feedback | Timer Default |
|------|----------|--------------|
| Practice | Immediate per-question | 90s per-question |
| Exam | After full submission | 115 min overall |

## Key Patterns

- **No build step** — edit files directly, reload browser
- All scripts loaded as global `<script>` tags before `</body>`
- Scoring: 75% pass threshold, no partial credit for multi-select
- Keyboard shortcuts: A-D/1-4 (select), Enter (submit), arrows (navigate), F (flag)
- Question sets defined in `QUESTION_SETS` manifest in `question-loader.js`

## Common Pitfalls

- Always test with HTTP server, not `file://`
- `quizState` is a global — check for null before accessing
- `renderCurrentQuestion()` is the central re-render function; call it after any state change
- Multi-select questions require ALL correct answers selected (array equality check via `arraysEqual()`)
