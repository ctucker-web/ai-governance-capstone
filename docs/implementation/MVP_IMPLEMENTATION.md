# Working MVP implementation

This implementation extends the established modular-monolith design and preserves the original SRS, Software Design Document, branching strategy, test plan, and standalone Unit 4 prototype. Development started from `development` on `feature/mvp-application`; the original prototype and Unit 4 notes were recovered unchanged from `feature/initial-mvp`.

## Architecture and source map

| Requirement / diagram module | Implementation | Boundary |
| --- | --- | --- |
| FR-01 / authentication | `src/modules/auth/session.ts`, `/api/session`, `/login` | Signed, expiring HTTP-only demo session; replaceable identity provider contract |
| FR-02 / RBAC | `src/modules/auth/policy.ts`, workflow service | All reads and mutations enforce actor, organization, ownership, role, and reviewer assignment on the server |
| FR-03 / intake | `src/components/intake-form.tsx`, `src/modules/intake/validation.ts` | Three guided steps, validated drafts, owner edits and follow-up |
| FR-04 / inventory | `governance-app.tsx`, `getWorkspace()` | Persisted inventory with search, department/status/tier filters, and sorting |
| FR-05–06 / risk | `src/modules/risk/engine.ts` | Eight explicit dimensions; deterministic weighted scores and configurable escalation |
| FR-07–08 / review | `src/modules/workflow/service.ts`, `record-detail.tsx` | Independent assigned reviewer, required rationale, conditional mitigations, transactional decisions |
| FR-09 / evidence and mitigation | Same service; Evidence and Mitigation tables | HTTP(S) references, review metadata, named owner, due date, completion notes, reviewer-only waiver |
| FR-10 / audit | AuditEvent table and `preserve_history` migration | Append-oriented events, database triggers reject update/delete |
| FR-11 / reporting | Dashboard, inventory, mitigation and audit screens | Role-scoped counts and filtered tables, no advanced analytics |
| FR-12 / reassessment | Reassessment table and service | Approved-use schedule, computed due status, manual restart, immutable assessment versions |
| Administration | `administration.tsx`, RiskConfiguration, RoutingRule | Versioned scoring policy, reviewer by tier, 7–730-day interval |
| PostgreSQL system of record | `prisma/schema.prisma` and migrations | All governance data persists server-side; no localStorage governance database |
| Supporting services | Dockerfile, compose, GitHub Actions | Container-friendly application, local database, automated checks; OIDC integration remains an adapter boundary |

`diagrams/ai-governance.drawio` contains the editable diagram used for implementation. The previous `diagrams/System_Architecture.md` remains intact. Small modules share the workflow transaction service rather than creating empty directories for every conceptual module.

## Data model

Organization owns users, AI systems, policy versions, and routing rules. UserRole assigns enum roles to users. AISystem has many UseCases; each UseCase owns RiskAssessments, Reviews, Evidence, Mitigations, AuditEvents, and Reassessments. Every assessment contains eight normalized RiskAssessmentFactor rows, a version, input snapshot, policy snapshot, score, and triggered rules. Review names the accountable reviewer and references exactly one assessment; Decision is a separate, immutable one-per-review record. Evidence records the submitting user and optional reviewer-confirmed review date. Mitigations name their owner and retain state-change notes in audit history. IDs are UUIDs; timestamps use UTC.

Factor definitions are a typed eight-dimension catalog rather than an editable RiskFactor table. Organization-specific weights, thresholds, escalation switches, and reassessment interval are versioned JSON validated by Zod. This keeps policy configurable without building a policy-language editor. The public UI does not manage organizations or user provisioning.

## Risk algorithm

Each answer is an integer from 0 (least identified risk) to 3 (highest). Every dimension contributes `answer × weight`; default weights are 1. The total has these demonstration thresholds:

| Score | Advisory tier |
| --- | --- |
| Under 8 | Low |
| 8 to under 15 | Moderate |
| 15 to under 22 | High |
| 22 and above | Executive exception |

Weights can range from 0.25–5, thresholds must increase and be attainable, and inputs are validated on the server. Enabled escalation rules can raise—but never lower—the numeric tier:

1. Fully autonomous clinical or employment decisions → Executive exception.
2. Highly sensitive data with limited/unknown vendor assurance → High.
3. High-impact outcomes with limited/no meaningful oversight → High.

“Executive exception” represents the requested prohibited/requires-exception attention tier. It is explicitly not a software rejection. A named independent reviewer makes every final decision. No machine learning or LLM is involved. Default policy is illustrative, not a validated clinical, employment, or legal determination.

## Workflow and consistency

- Draft creation stores a validated intake; edits are restricted to its owner while Draft or Needs information.
- Submit validates the stored fields again, snapshots the intake and policy, calculates risk, checks independent routing, creates the review, and records Submitted → Under review events in one serializable transaction. Missing routing rolls everything back.
- Assigned reviewers request more information or enter a final decision. Approval, conditional approval, and rejection require rationale. Conditional approval also requires at least one mitigation in the same transaction.
- Requester follow-up closes the previous review, creates a new assessment version, and routes a new review. Previous versions remain readable.
- Approval sets review date and next reassessment date using the assessed policy's interval. Reassessment due is derived at read time, so no scheduler is necessary.
- Manual reassessment records the reason and returns the use to Draft. The owner updates it and submits the next version. Prior decisions remain historical records, not the new request's approval.
- A revision counter and serializable transactions prevent stale or competing decisions. Serialization conflicts retry up to three times; stale revisions return a readable conflict.
- Audit events, assessments, factor results, decisions, policy versions, and reassessments reject update/delete at the database layer. A database superuser can bypass these safeguards; this is not a tamper-proof external ledger.

## Security boundary

The browser never supplies its role or organization. `/api/workspace` resolves a signed cookie to a local user and assigned roles on every request. Workspace queries are organization-scoped and role-filtered: requester owns the record, reviewer has an assignment, administrator sees the organization, auditor sees currently approved records. Administrator status does not automatically grant review authority.

Every cookie-authenticated mutation requires the configured APP_URL origin, plus SameSite=Strict cookies. Session tokens expire after eight hours and are HMAC signed with an environment-only random secret. React encodes user text; evidence links accept only HTTP(S); Prisma parameterizes data access. Server logs avoid form bodies. `.env`, local databases, dependency directories, and build output are excluded from Git and Docker context.

Demo login is deliberately available only when both AUTH_MODE=demo and DEMO_AUTH_ENABLED=true. It allows anyone with access to the demo to select fictional identities and is unsuitable for sensitive data or production. An OIDC adapter is not yet implemented: the IdentityProvider contract accepts verified identity and returns a mapped local user ID, while the services continue consuming Actor.

## Portability and limitations

Local setup supports Docker PostgreSQL or a real embedded PostgreSQL binary from the reputable npm package, with persistent local data and UTF-8 initialization (including Windows). The latter is development-only. The application image runs as the non-root node user. Migrations run as an explicit setup step; the app does not silently migrate production databases.

This is an academic MVP, not production-ready software. Evaluation uses synthetic/de-identified scenarios, a limited number of representative users, and organization-neutral examples. Broad nonprofit generalizability has not been established. Adoption depends on governance maturity, staffing, leadership support, workflow fit, and user acceptance. Accessibility and timing goals require formal evaluation; passing automated checks is not WCAG certification or a usability study. See FUTURE_WORK.md for production prerequisites and v2 ideas.
