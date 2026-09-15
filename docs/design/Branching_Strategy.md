# Git Branching and Traceability Strategy

## Branches

### `main`
Stable, reviewed project state. This branch is intended to represent submission-ready or release-ready code and documentation.

### `development`
Active integration branch. Completed feature and documentation changes are combined here before promotion to `main`.

### `feature/*`
Short-lived branches used for focused changes. Examples include `feature/risk-assessment`, `feature/intake-form`, and `feature/dashboard`.

## Workflow

```text
feature/*
   ↓ pull request
 development
   ↓ testing/review
   ↓ pull request
 main
```

## Commit Message Convention

Commits use short action-oriented prefixes to improve traceability:

- `feat:` new application functionality
- `fix:` defect correction
- `design:` architecture or design change
- `docs:` documentation change
- `test:` test assets or test changes
- `ci:` continuous-integration changes
- `chore:` repository or maintenance work

Examples:

- `feat: add AI use-case intake form`
- `design: document preliminary risk classification rules`
- `test: add high-risk workflow scenarios`
- `docs: update software requirements specification`

## Traceability

Version control supports capstone traceability by connecting requirements, design decisions, implementation changes, test assets, and documentation to dated commits. Pull requests provide an additional review record showing what changed, why it changed, and which branch received the change. Even though this capstone is currently a single-developer project, the workflow models a collaborative software-engineering process and allows future contributors to participate without committing directly to the stable branch.

## Data and Secret Handling

No credentials, API keys, PHI, production PII, or confidential organizational material should be committed. Test and demonstration data must be synthetic or appropriately de-identified.
