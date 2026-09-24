# MVP validation evidence

Validation date: September 24, 2026. All application data used for these checks is synthetic.

## Environment and method

Local Windows host, Node.js 24.19.0, pnpm 11.19.0, PostgreSQL 18.4 with UTF-8 databases, Prisma 6.19.3, Next.js 16.3.6, Vitest 3.2.7, and Playwright Chromium. The production application is built before browser testing. Browser tests run on port 3100 against a dedicated database ending in `_test`; the demonstration uses a separate database on port 3000.

Each phase runs `node scripts/verify.mjs <phase>`, which executes ESLint, Prisma generation, TypeScript checking, unit tests, test migration/seed, PostgreSQL integration tests, production build, and browser tests. A nonzero exit stops the gate. Local full logs and per-command exit codes are retained in ignored `.local/validation/`; environment secrets are excluded from this report and Git.

## Observed checkpoints

| Checkpoint | Result | Tests |
| --- | --- | --- |
| Phase 1 inspection | All gates passed | 26 unit, 9 integration, 3 browser |
| Phase 2 runnable foundation | All gates passed | 26 unit, 9 integration, 3 browser |
| Phase 3 intake and risk | All gates passed | 38 unit, 9 integration, 3 browser |
| Phase 4 workflow | All gates passed after correcting an ambiguous browser locator | 38 unit, 9 integration, 3 browser |
| Phase 5 governance controls | All gates passed after rebuilding generated output | 49 unit, 10 integration, 4 browser |
| Phase 6 documentation and CI handoff | All local gates passed | 49 unit, 10 integration, 4 browser |

The implementation preceded the later phase-method instruction in part; see the Phase 1 repository review for the exact chronology. The checks above were actually executed, not inferred from the existence of test files. Separate commits preserve each checkpoint.

The local production dependency audit (`pnpm audit --prod --audit-level high`) completed successfully with no known vulnerabilities at validation time. This does not guarantee the absence of vulnerabilities. The original prototype and Unit 4 notes remain unchanged.

## What the acceptance checks prove

- Migrations apply and additive seed data loads into real PostgreSQL. Six fictional demonstration scenarios are available.
- A requester enters clinical intake and eight scored answers, submits, and sees the advisory tier, reasons, individual contributions, and assigned independent reviewer.
- The reviewer adds evidence metadata, enters a final conditional decision and rationale, and creates a dated mitigation with an accountable owner.
- The inventory and dashboard reflect the decision. The requester completes the mitigation; evidence, decision, and mitigation audit entries are visible.
- Reassessment produces a second assessment while preserving the first assessment, factors, policy snapshot, and decision. Review and next-review dates persist.
- Administrator changes survive reload, create policy versions, and record routing in audit history. Stale policy writes are rejected.
- Server tests reject unauthorized/self/unassigned decisions, cross-organization access, inappropriate mitigation ownership, unsafe evidence URLs, and invalid input. Concurrent decisions cannot both succeed; failed routing/ownership operations roll back.
- Database triggers reject history edits/deletions. Session tests reject tampering, expiry, malformed signatures, and wrong signing keys.
- Browser tests cover keyboard record tabs and a 390px mobile intake without page overflow.

## Failures encountered and resolved

- Windows initially initialized PostgreSQL using WIN1252, which rejected Unicode audit text. The local bootstrap now explicitly creates UTF-8 databases. Fresh UTF-8 databases were migrated and seeded; previous local databases were preserved.
- Initial browser assertions used text that also matched hidden dropdown options. Assertions now target the visible result or the intended combined text. No feature or test requirement was removed.
- Browser assertions passed inside the restricted execution sandbox, but the runner did not exit. Those runs were not counted as successful exits. Running the suite with approved execution permissions produced exit code zero.
- A generated Next.js directory became a OneDrive reparse point, causing `EPERM` during build cleanup. Only generated output was moved to an ignored recovery directory; a fresh production build passed. Database and source files were untouched.
- A transitive production dependency advisory was addressed with the patched `deepmerge-ts` override. Generation, migrations, tests, and builds were rechecked.

## CI and validation limits

GitHub Actions is configured for documentation, lint, types, unit/integration/browser tests, build, production dependency audit, and a non-root Docker-image health/authentication smoke test. The actual remote result must be read from the feature pull request's checks; workflow configuration alone is not evidence that a run passed. Docker is unavailable on the local host, so local container execution is not claimed.

OIDC provider integration, real-user acceptance research, formal accessibility conformance, load testing, production hosting, and broad nonprofit generalizability are not validated. This remains an academic MVP using synthetic data. Representative-user evaluation and an independently reviewed production identity integration are the next steps.
