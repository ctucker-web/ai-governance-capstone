# Unit 4 Initial MVP Implementation

## Purpose

This Unit 4 prototype demonstrates the first working implementation of the AI Governance Risk and Approval Platform. The MVP translates the Unit 3 system design into a small end-to-end workflow that can be demonstrated in a browser without requiring production infrastructure or sensitive data.

## Development environment

- Editor: Visual Studio Code or another text editor/IDE
- Source control: GitHub
- Branch: `feature/initial-mvp`
- Runtime: modern web browser
- Technologies: HTML5, CSS3, JavaScript, browser localStorage
- Data: synthetic demonstration records only

The browser-only implementation is intentional for the first working prototype. It reduces setup complexity while validating the user workflow and rule-based governance logic. The production-oriented architecture still calls for OIDC-compatible authentication, server-side role-based authorization, and PostgreSQL persistence. Those integrations are deferred until the workflow has been validated.

## Working modules

### 1. Prototype role and access control

The user can switch among Requester, Reviewer, and Administrator demonstration roles. Review actions are only displayed for Reviewer and Administrator roles. This is a UI-level prototype of the RBAC design; production authorization must be enforced server-side.

### 2. AI use-case intake

The intake form captures the AI tool/system name, department, business purpose, and structured risk questions. Required fields are validated by the browser before submission.

### 3. Explainable advisory risk assessment

The prototype calculates an advisory risk score from five factors:

- data sensitivity;
- impact on clients or employees;
- AI autonomy;
- risk created by limited human oversight; and
- vendor assurance evidence.

The output is Low, Moderate, High, or Restricted. High-risk contributing factors are retained and displayed. The score is advisory and does not make the final governance decision.

### 4. Central AI inventory

Every submitted use case becomes an inventory record containing a unique ID, tool name, department, business purpose, risk tier, and decision status.

### 5. Human review and rationale

A Reviewer or Administrator can approve, conditionally approve, or reject a pending use case. The reviewer must enter a rationale. This preserves the design principle that a human remains the final governance authority.

### 6. Audit events

Submission and decision actions create timestamped audit events containing the request ID, action, time, and demonstration actor.

## Architecture mapping

| Unit 3 logical module | Unit 4 prototype implementation |
| --- | --- |
| Authentication & RBAC | Demonstration role selector and role-aware controls |
| Use-Case Intake | Working structured intake form |
| AI Inventory | Browser-based central inventory |
| Risk Assessment Engine | Deterministic rule-based scoring and tiering |
| Workflow & Approval | Pending queue plus reviewer decision actions |
| Evidence & Decision Records | Risk factors and decision rationale |
| Audit Logging | Timestamped browser-local audit history |
| Dashboard & Reporting | Summary metrics and recent assessments |
| Administration & Configuration | Deferred beyond initial prototype |

## Design principles preserved

1. **Human authority:** the algorithm is advisory; the reviewer records the final decision and rationale.
2. **Explainability:** high-risk factors are retained with the calculated tier.
3. **Least privilege:** review controls are role-aware in the prototype; server-side enforcement is planned.
4. **Auditability:** material actions generate traceable events.
5. **Privacy by design:** only synthetic demonstration data is used.
6. **Simple MVP:** the first version intentionally prioritizes a clear end-to-end workflow over advanced automation.

## How to run the demo

1. Open `src/frontend/demo/index.html` in a modern browser.
2. Start on the Dashboard.
3. Select **New assessment** and enter a sample AI use case.
4. Set risk factors and submit the form.
5. Show the advisory risk tier and the new record in **AI inventory**.
6. Change the demo role from Requester to Reviewer.
7. Open **Review queue** and record a decision with rationale.
8. Show the resulting audit event.

## Current limitations

This is an early MVP, not a production deployment. Authentication is simulated rather than connected to an identity provider; authorization is demonstrated at the UI level rather than enforced on a server; persistence uses browser localStorage instead of PostgreSQL; and formal usability, security, and performance testing are not yet complete. These limitations are deliberate and allow the Unit 4 implementation to validate the core governance workflow before introducing infrastructure complexity.

## Next implementation steps

- migrate the prototype interface into the planned Next.js/TypeScript application structure;
- connect PostgreSQL for persistent governance records;
- integrate OIDC authentication and server-side RBAC;
- add automated tests for risk scoring and workflow transitions;
- add configurable risk thresholds and routing rules;
- expand evidence and mitigation tracking;
- connect the existing GitHub Actions workflow to lint, test, and build the application.
