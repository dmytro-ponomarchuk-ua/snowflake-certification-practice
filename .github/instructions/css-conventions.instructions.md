---
description: "CSS conventions for the quiz app. Use when: modifying styles, adding CSS classes, theming, or creating new UI components."
applyTo: "web-app/css/**"
---
# CSS Conventions

- Use CSS variables from `:root` — never hardcode colors or spacing
  - Brand: `var(--primary)` (#29B5E8), `var(--primary-light)`, `var(--primary-dark)`
  - Feedback: `var(--success)`, `var(--danger)`, `var(--warning)`
  - Neutrals: `var(--gray-50)` through `var(--gray-900)`
  - Layout: `var(--radius)`, `var(--shadow)`, `var(--transition)`
- Naming: semantic class names (`.question-card`, `.option-item`), not BEM
- State modifiers: `.selected`, `.correct`, `.incorrect`, `.disabled`, `.flagged`
- Utility classes: `.hidden`, `.mt-8`, `.mb-16`, `.text-sm`, `.text-muted`
- Button variants: `.btn-primary`, `.btn-success`, `.btn-danger`, `.btn-outline`, `.btn-flag`
- Responsive: mobile-first, breakpoints at `640px` and `480px`
- Transitions: use `var(--transition)` for consistent timing
