---
name: quiz-feature
description: "Add or modify quiz UI features. Use when: changing quiz behavior, adding new question types, modifying answer feedback, updating navigation, changing timer logic, or editing the quiz page layout."
---
# Quiz Feature Development

## When to Use
- Adding new quiz functionality (new question types, UI components)
- Modifying answer submission, feedback, or scoring behavior
- Changing navigation, keyboard shortcuts, or timer behavior
- Updating the quiz page layout or results display

## Key Files

| File | What to edit |
|------|-------------|
| `web-app/js/quiz-engine.js` | State machine, rendering, selection, submission, scoring, keyboard shortcuts |
| `web-app/js/timer.js` | Timer start/stop/pause/resume, per-question and overall modes |
| `web-app/js/results.js` | Score display, domain breakdown, history, review cards |
| `web-app/js/question-loader.js` | Question fetching, shuffling, distribution |
| `web-app/js/app.js` | Setup screen logic, config, mode toggles |
| `web-app/quiz.html` | Quiz page structure and button elements |
| `web-app/results.html` | Results page structure |
| `web-app/css/styles.css` | All styling (uses CSS variables from `:root`) |

## Quiz State Machine

The global `quizState` object in `quiz-engine.js` holds all runtime state:

```javascript
quizState = {
  config,           // { setIds, mode, timerMode, timerValue, questionCount, shuffle }
  questions,        // merged/shuffled/sliced array from question-loader
  currentIndex,     // 0-based index of current question
  answers: {},      // questionId → [selectedKeys]
  flagged: Set,     // flagged question IDs
  timedOut: Set,    // timed-out question IDs
  submitted: {},    // questionId → true (practice mode per-question)
  startTime, endTime
}
```

## Development Procedure

1. Read the relevant source files listed above before making changes
2. For rendering changes: modify `renderCurrentQuestion()` — this is the central re-render function
3. After any state mutation, call `renderCurrentQuestion()` to update the UI
4. For new CSS: use variables from `:root` (see `css/styles.css` top), use semantic class names
5. Test with HTTP server (`python -m http.server 5500` in `web-app/`), not `file://`
6. Test both Practice and Exam modes — they have different feedback flows
7. Verify keyboard shortcuts still work (A-D, 1-4, Enter, arrows, F)

## Scoring Rules
- Pass threshold: 75%
- No partial credit for multi-select (all correct answers required)
- Equality check: `arraysEqual()` with sorted arrays
