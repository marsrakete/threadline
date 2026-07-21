# Project Guidelines

## Purpose

These guidelines are meant as a reusable default for frontend-oriented projects. The goal is not maximum cleverness, but code that stays understandable, stable and easy to extend.

## Core principles

- Prefer clarity over brevity.
- Prefer maintainability over cleverness.
- Separate structure, styling, behavior and data.
- Keep repeated patterns consistent across the project.
- Make future changes easier, not just the current change possible.

## Project structure

- HTML or templates define structure.
- CSS defines presentation.
- JavaScript or TypeScript defines behavior and state changes.
- Configuration and content data belong in dedicated files.
- Translations belong in dedicated language files.

Do not mix these layers unnecessarily.

## HTML and templating

- Keep markup semantic and structured.
- Use reusable templates or components for recurring UI patterns.
- Avoid building large HTML strings in JavaScript when DOM APIs or templates are a better fit.
- Keep visible copy out of business logic whenever possible.

## CSS

- Store styles in external stylesheet files.
- Organize CSS by component or layout area.
- Keep selectors predictable and readable.
- Avoid inline styles except for truly dynamic runtime values.
- Design responsive behavior intentionally.

## JavaScript / TypeScript

- Favor readable `if / else` blocks over compact one-liners.
- Avoid nested ternaries.
- Avoid "clever" expressions that slow down reading.
- Use small helper functions when they improve clarity.
- Use descriptive names for variables and functions.
- Keep rendering logic, calculation logic and data access separated where possible.

## Rendering rules

- Prefer structured DOM creation over concatenated markup strings.
- Use `textContent` for plain text.
- Use templates or component-like helpers for repeated UI blocks.
- Use `innerHTML` only when there is a real benefit and the structure is controlled.

## Data and configuration

- Keep static data and configuration outside the main rendering code.
- Do not scatter constants, labels and reference data across unrelated files.
- Keep data sources and assumptions easy to find.

## Internationalization

- All user-facing text should be centralized.
- Translation files must be saved in UTF-8.
- Broken encoding is treated as a bug.
- Do not hardcode visible UI text across multiple render paths.

## Comments and documentation

- Comment complex or non-obvious logic.
- Explain why something is done, not only what the code literally does.
- Avoid commentary that just restates the line below it.
- Keep README and project docs in sync with major architectural or feature changes.

## UX and responsiveness

- Interfaces must remain readable on common mobile, tablet and desktop sizes.
- Text must not overlap, clip or become ambiguous.
- Interaction patterns should remain stable across viewports.
- Layout should adapt deliberately, not accidentally.

## Review checklist

Before merging or shipping a change, ask:

- Is this easy to read without extra explanation?
- Is the structure consistent with the rest of the project?
- Are layout, styling and behavior properly separated?
- Are texts centralized instead of scattered?
- Is the code easier to maintain after this change than before it?

If the answer is no, revise the implementation.
