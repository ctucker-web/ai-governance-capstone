# AI Governance Risk and Approval Platform

MSIT 5910 Capstone Project

Platform implementations are tracked in [VERSIONS.md](VERSIONS.md). The separate [PHP/MySQL Version](versions/php-mysql/README.md) targets existing DreamHost shared hosting; the root application remains the Next.js/PostgreSQL Version.

## Overview

This repository contains the design, documentation, source code, test assets, and release materials for a lightweight AI Governance Risk and Approval Platform intended for nonprofit organizations. The platform is designed to help organizations identify, assess, approve, document, and monitor artificial intelligence use in a consistent and auditable way.

The initial design is informed by nonprofit behavioral healthcare, but the architecture is intentionally adaptable so other nonprofit organizations can configure governance categories, approval roles, and workflows for their own environments.

## Problem

Nonprofit organizations increasingly encounter AI through purchased software, embedded vendor capabilities, productivity tools, and employee experimentation. Many organizations do not have a centralized workflow for documenting proposed AI use, assessing risk, identifying reviewers, recording decisions, and monitoring approved systems over time.

## Project Objectives

- Maintain a centralized inventory of AI systems and use cases.
- Capture structured AI use-case submissions.
- Assess risk using documented and explainable criteria.
- Route higher-risk uses to appropriate human reviewers.
- Record decisions, rationale, evidence, and mitigation actions.
- Maintain an auditable governance history.
- Support periodic reassessment of approved AI uses.
- Produce a reusable MVP that can be shared with nonprofit organizations.

## Working MVP Modules

1. Authentication and role-based access
2. AI use-case intake
3. AI system inventory
4. Risk assessment and classification
5. Review and approval workflow
6. Evidence and mitigation tracking
7. Audit history
8. Management dashboard and reporting
9. Reassessment and follow-up tracking

## Repository Structure

```text
src/                  Application source code
  app/                Next.js pages and authenticated route handlers
  components/         Accessible responsive workflow screens
  modules/            Authentication, validation, risk, and workflow services
  lib/                Database client and HTTP error handling
  frontend/demo/      Preserved standalone Unit 4 HTML prototype
  backend/            Original architecture notes
  database/           Original data-layer notes
prisma/               PostgreSQL schema, migrations, and synthetic seed
scripts/              Local setup, PostgreSQL, production start, test setup

docs/                 Project documentation
  requirements/       Software requirements specification
  design/             Architecture and software design documents
  research/           Literature and research notes
  testing/            Test plans and evaluation documentation
  user-guide/         User and administrator guidance

diagrams/             Architecture and design diagrams
sample-data/           Synthetic data only
tests/                 Automated and manual test assets
.github/workflows/     CI workflow definitions
```

## Branching Strategy

- `main` — stable, reviewed project state and release-ready documentation/code.
- `development` — active integration branch for ongoing capstone work.
- `feature/*` — short-lived branches for individual features or documentation changes.

Changes should normally move from a feature branch into `development`, then into `main` after review and testing.

## Security and Privacy

This public repository must not contain protected health information (PHI), personally identifiable information (PII), employee records, production credentials, API keys, confidential vendor materials, or internal organization-specific configuration. Development and testing will use synthetic or de-identified data only.

Secrets must be stored outside source control, such as in local environment variables or GitHub repository secrets.

## Current Status

Current phase: **Working application MVP**. Next.js, TypeScript, React, PostgreSQL, Prisma, Zod, Vitest, and Playwright implement the intake-to-decision lifecycle. Risk classification remains advisory; a named, assigned human reviewer is always the final authority.

The original browser-only Unit 4 prototype is preserved under `src/frontend/demo/index.html` for historical comparison. The full application uses server-side authorization and PostgreSQL, not the prototype's localStorage implementation.

## Run locally

Prerequisites: Node.js 22 or newer; pnpm 11.19.0 (`npm install -g pnpm@11.19.0`); Docker with Compose **or** a supported Windows/macOS/Linux host for the bundled local PostgreSQL option. Use synthetic data only.

```sh
git clone https://github.com/ctucker-web/ai-governance-capstone.git
cd ai-governance-capstone
git checkout feature/mvp-application
pnpm install --frozen-lockfile
pnpm run setup:local
```

`setup:local` creates an ignored `.env` with unique random local database and session secrets. It does not overwrite an existing `.env`. `.env.example` documents the variables; all values marked CHANGE_ME or REPLACE must be replaced if you configure manually.

Start PostgreSQL using **one** option:

```sh
# Option A: Docker, in the background
docker compose up -d db

# Option B: No Docker — keep this terminal open
pnpm run db:local
```

Option B starts real PostgreSQL on loopback port 5433, stores it in ignored `.local/postgres`, initializes UTF-8, and also creates a separate test database. It does not install a Windows service or require a commercial provider. Stop it with Ctrl+C; data is preserved. A production deployment should use managed PostgreSQL instead.

In another terminal:

```sh
pnpm run db:generate
pnpm run db:migrate
pnpm run seed
pnpm run dev
```

Open **http://localhost:3000** and choose a fictional identity. Use the exact APP_URL hostname; origin checks intentionally reject a different host such as `127.0.0.1` when APP_URL is `http://localhost:3000`.

Six synthetic use cases cover meeting summaries, a productivity assistant, clinical documentation, applicant ranking, invoices, and donor outreach. Seeding is additive and idempotent; it does not erase decisions you make. Data remains in PostgreSQL across application restarts.

To run the optimized build, stop the development server first:

```sh
pnpm run build
pnpm run start
```

On Windows, stop application processes before regenerating Prisma Client: Windows locks a loaded query-engine DLL. Do not delete the database to resolve a file lock.

Prefer a working checkout outside OneDrive or other synchronized directories. A OneDrive reparse point in generated `.next` output can cause `EPERM` during the next build. Stop the app, preserve/rename only the generated `.next` directory, and rebuild; keep `.env` and `.local/postgres` intact.

## Roles and demonstration

| Identity | Role | Access |
| --- | --- | --- |
| Alex Morgan | Requester | Own drafts, submissions, follow-up, status, evidence, and owned mitigation completion |
| Jordan Lee | Reviewer | Low/moderate review assignments and human decisions |
| Taylor Chen | Reviewer / executive review demo | High-risk and executive-exception assignments |
| Sam Rivera | Administrator | All organization records, scoring policy, routing, reassessment interval, and audit history |
| Casey Taylor | Auditor | Currently approved/conditionally approved records and their history; no modifications |

An administrator is not automatically an approver. Requesters cannot approve themselves, even if granted a reviewer role. Executive routing is an assignment policy; v1 does not implement a separate executive-signatory role.

Try the acceptance workflow:

1. Choose Requester, then **New assessment**. Enter a fictional clinical documentation use case, people affected, data categories, oversight, and vendor controls.
2. Answer all eight risk questions. Highly sensitive data with limited vendor assurance must escalate to High. Submit and inspect the contributing factors and assigned reviewer.
3. Select **Switch demo identity**, choose Taylor Chen, and open the request from **Review queue**.
4. Review the **Evidence** section; add a reference if needed. In **Overview**, choose conditional approval, enter rationale, and require “Human verification required before AI-generated content enters the official record.” Set an owner and due date.
5. Record the decision. Verify the inventory status, reviewer, review date, scheduled reassessment, mitigation, and audit event.
6. As the requester, complete the mitigation with notes, or start a reassessment with a material-change reason. Edit and resubmit the new draft to create another assessment version. Previous assessments and decisions remain in History.

Risk scoring uses eight 0–3 answers, configurable weights, thresholds (default 8 / 15 / 22), and explicit escalation rules. No LLM, machine learning, or automated approval/rejection is used. Each assessment preserves inputs, individual contributions, triggered rules, policy, version, and timestamp.

## Tests and CI

```sh
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

For the complete local phase gate, run `node scripts/verify.mjs phase-name`. The script stops on failure and retains local verification logs. The current automated suite contains 49 unit, 10 PostgreSQL integration, and 4 browser tests.

`TEST_DATABASE_URL` must name a dedicated database ending in `_test`. For the Docker option, create it once with `docker compose exec db sh -c 'createdb -U "$POSTGRES_USER" governance_test'`. The no-Docker option creates it automatically. Tests migrate/seed the dedicated database and add synthetic records without touching the demo database. Browser tests start a separate server on port 3100. GitHub Actions runs documentation checks, lint, type checking, unit/integration/browser tests, build, and production dependency audit on PRs and pushes to development/main. It does not deploy automatically.

The `deepmerge-ts` override selects the patched v8 release for Prisma's configuration dependency; generation, migrations, and build are checked with that override. The lockfile pins reproducible dependency versions.

## Containers

The Dockerfile produces a non-root standalone Next.js image. For a local container demonstration, start the database, apply migrations and seed using the commands above, then run `docker compose --profile app up --build -d`. APP_URL must match the browser origin. Do not expose demo identity selection or local database ports publicly. Docker execution requires a Docker daemon; see validation evidence for what was actually exercised in this environment.

## Security, privacy, and limitations

- Server-side RBAC, ownership and organization scoping, independent reviewer checks, Zod validation, Prisma parameterized persistence, signed expiring HTTP-only cookies, SameSite=Strict, and Origin validation are implemented.
- Ordinary application actions cannot edit audit events, assessment snapshots, decisions, or policy versions; PostgreSQL triggers also reject their update/deletion. Database administrators retain privileged access and can bypass triggers.
- Use governance metadata and category labels, never raw sensitive records. Evidence stores references and metadata instead of uploaded documents. Logs omit request bodies.
- Demo authentication is enabled explicitly through AUTH_MODE and DEMO_AUTH_ENABLED. OIDC is an architectural extension point, not a completed production login integration. Before non-demo deployment, implement and test the provider adapter, disable demo login, use HTTPS with COOKIE_SECURE=true, separate migration/runtime database roles, and operational security controls.
- This is an **academic MVP, not production-ready software**. Evaluation uses synthetic/de-identified scenarios and will involve a limited number of representative users. Broad nonprofit generalizability has not been established. Adoption depends on governance maturity, staffing, leadership support, workflow fit, and user acceptance.
- One accountable reviewer is routed per tier. Drafts are saved after all required intake fields are complete. Reassessment due is computed from dates; notifications and scheduled jobs are deferred. The app loads the accessible MVP-sized inventory at once; enterprise pagination/scale, user administration, actual multi-tenant onboarding, formal WCAG certification, and broad usability validation remain future work.

Implementation mapping: [MVP implementation](docs/implementation/MVP_IMPLEMENTATION.md). Test procedure: [MVP test plan](docs/testing/MVP_TEST_PLAN.md). Observed execution results: [validation evidence](docs/testing/MVP_VALIDATION.md). [Version 2.0 roadmap](FUTURE_WORK.md) includes reviewer-drift and automation-bias research, calibration, integrations, and richer configuration.

## Academic Context

University of the People  
Master of Science in Information Technology  
MSIT 5910 Capstone Project

## Public-Interest Goal

The long-term goal is to make a sanitized version of the MVP available to nonprofit organizations through a hosted demonstration, open-source code, implementation documentation, or a combination of these approaches.

## License

A final open-source license will be selected before public release of the reusable MVP. Until then, no additional redistribution rights are granted beyond those provided by applicable law.
