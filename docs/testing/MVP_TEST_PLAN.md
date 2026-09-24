# MVP test plan

## Reproducible checks

Use Node 22+ and pnpm 11.19.0. Start PostgreSQL and prepare `.env` as described in README.

```sh
pnpm install --frozen-lockfile
pnpm run db:generate
pnpm run lint
pnpm run typecheck
pnpm run test
node scripts/prepare-test-db.mjs
pnpm run test:integration
pnpm run build
pnpm exec playwright install chromium
pnpm run test:e2e
pnpm audit --prod --audit-level high
```

`TEST_DATABASE_URL` must refer to a dedicated database whose name ends in `_test`. Preparation applies migrations and seeds synthetic examples without dropping existing data. Integration and browser tests create additional synthetic records; no test points at a real organizational database. Browser tests start the production application on port 3100 against the test database, leaving the local demo on port 3000 alone.

## Automated coverage

| Suite | Cases | Assertions |
| --- | --- | --- |
| Risk engine | 23 | Every tier boundary, overlapping/disabled escalation rules, weighted explanations, deterministic output, immutable inputs, invalid scores and policy |
| Authorization and validation | 15 | Role checks, self-review and unassigned review denial, due-status derivation, required intake, required rationale for all outcomes, conditional mitigation, unsafe URL and waiver rejection |
| Session integrity | 11 | Signature validation, expiry deadline, tampered identity/expiry, wrong secret, malformed and non-ASCII signatures |
| PostgreSQL integration | 10 | Clinical lifecycle, role and record visibility, follow-up versioning, atomic routing/owner failures, concurrent decisions, mitigation ownership, tenant isolation, policy versions and routing audit, database immutability |
| Browser | 4 | Clinical evidence/approval/inventory/mitigation/reassessment and keyboard flow; persisted administration; unauthenticated/forged-session/cross-origin rejection; mobile intake and overflow check |

The end-to-end clinical scenario selects sensitive-data categories and human oversight, submits the request, sees high advisory risk and escalation reasons, signs in as the routed reviewer, adds an evidence reference, and records conditional approval with rationale and the required human-verification mitigation. It checks inventory/dashboard, completes the mitigation as requester, checks audit entries, navigates record tabs with the keyboard, and submits a reassessment while preserving both assessment versions. A separate browser test changes an administrative interval, reloads to verify persistence, restores it with another policy version, and checks the routing audit. Integration tests verify persisted review/reassessment dates and unchanged prior snapshots.

`node scripts/verify.mjs phase-name` runs the local phase gates sequentially and records logs and exit codes in ignored `.local/validation/`. Repeated runs archive earlier results. No failure is converted to success, and later gates stop when a command fails. CI additionally builds and smoke-tests the non-root application image against PostgreSQL.

## Manual evaluation still required

Recruit a limited, explicitly documented set of representative nonprofit requesters, reviewers, and administrators. Give participants these tasks without developer assistance: submit an idea, understand why it received a tier, find a pending record, request clarification, provide follow-up, record conditional approval, complete a mitigation, retrieve rationale, and begin reassessment. Record completion rate, time, errors, and participant comments. Target at least 90% successful completion of predefined core usability tasks; do not claim this target has been measured until evaluation occurs.

Check keyboard-only navigation, visible focus, readable labels and error messages, screen-reader announcements, zoom, contrast, and narrow screens. Automated mobile checks alone do not establish WCAG 2.2 AA conformance. Confirm ordinary local pages are approximately within 2 seconds and risk computation within 1 second using repeatable measurements and stated hardware. Review all critical defects before capstone submission.

## Execution evidence

See `MVP_VALIDATION.md` for the actual commands and observed results. GitHub Actions is configured to execute the checks on pull requests and pushes to development/main; do not equate configuration with an observed remote workflow run.
