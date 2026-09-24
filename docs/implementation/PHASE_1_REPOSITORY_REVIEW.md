# Phase 1: repository inspection and execution plan

## Baseline inspected

Repository: `ctucker-web/ai-governance-capstone`. Baseline: development commit `7e47fb9`. Working branch: `feature/mvp-application`.

Read README, SRS, Software Design Document, Branching Strategy, and Test Plan before implementing. The development branch had no executable application or package manifest. It contained architecture documents and README placeholders in `src/frontend`, `src/backend`, and `src/database`; diagrams, sample-data, tests, and a documentation-only CI workflow were already present.

The remote `feature/initial-mvp` branch contained `src/frontend/demo/index.html` and `docs/implementation/UNIT4_INITIAL_MVP.md`. Both were inspected and preserved unchanged. No AGENTS.md was present in the checkout.

## Reusable prototype work

- Four-screen dashboard/intake/inventory/review navigation concept.
- Nontechnical use-case labels, department/purpose fields, and explainable advisory risk.
- Demonstration role selection, human rationale, synthetic sample records, and audit presentation.
- Organization-neutral project language and the deliberate modular-monolith architecture.

The standalone prototype remains a historical demonstration. Its imperative DOM code is not imported into React; the relevant interactions and concepts are retained in accessible components.

## Conflicts / gaps against the requested MVP

| Prototype or baseline | Required resolution |
| --- | --- |
| Browser localStorage is the system of record | PostgreSQL with migrations and relational history |
| UI-only roles; administrator can decide | Server-side scope and operation checks; assigned independent reviewer only |
| Five hard-coded dimensions and thresholds | Eight validated factors, versioned settings, configurable thresholds and escalation |
| prompt() rationale and overwritten decision fields | Explicit forms, required rationale, immutable decisions linked to an assessment review |
| Input inserted into HTML strings | React output encoding and server-side validation |
| No durable evidence, mitigation, reassessment, or auditor workflow | Implement all as persisted, role-controlled records |
| Documentation-only CI | Lint, typecheck, tests, build, browser checks, dependency audit |

## Exact implementation plan and gates

1. **Inspection:** report baseline, reusable work, gaps, and this plan. Preserve existing documentation and prototype.
2. **Foundation:** Next.js/TypeScript modular monolith, PostgreSQL/Prisma schema and migrations, synthetic seed, signed demo sessions with replaceable identity-provider boundary, navigation/dashboard, local setup and production start. Verify database setup and startup; commit the foundation.
3. **Intake and risk:** guided intake, deterministic eight-factor scoring, explicit escalation, complete explanation and snapshots, boundary/configuration tests. Verify all checks; commit risk validation work.
4. **Review lifecycle:** inventory and queue, independent human decision/rationale, evidence, mitigations and immutable audit history. Run the clinical conditional-approval scenario against PostgreSQL and in a real browser; commit the verified lifecycle.
5. **Governance controls:** versioned reassessment and configuration, authorization denial tests, end-to-end coverage, keyboard/mobile/accessibility cleanup. Verify all checks; commit governance-control improvements.
6. **Handoff:** GitHub Actions, tested README commands, module-to-SRS mapping, validation evidence, limitations and v2 roadmap. Verify all checks and commit documentation/CI.

At each application gate run lint, Prisma generation/type checking, unit tests, test database migration/seed, integration tests, production build, and browser tests. Stop on failure and retain the failing evidence. `scripts/verify.mjs` records the full output in ignored `.local/validation/`; checked-in validation notes summarize outcomes without secrets.

## Sequencing note

The phased-method instruction arrived after substantial implementation had already been produced under the original request. That work is preserved rather than discarded. Phase 1 is an inspection/reporting checkpoint; verification of the existing working-tree implementation does not mean that the original documentation-only baseline contained a runnable app. Subsequent commits explicitly distinguish preserved pre-phase work from new tests, corrections, and documentation. No retroactive claim is made that earlier work passed an unexecuted phase gate.

The user subsequently asked to continue the work, so the plan proceeds through the remaining phases without a separate approval pause.
