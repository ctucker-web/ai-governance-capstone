# Unit 5 Core Logic Implementation

## Purpose

Unit 5 moves the capstone from a browser-only proof of concept toward testable modular application logic. The core objective is to implement and validate the deterministic AI governance risk engine and the human decision workflow that make the platform useful.

## Core algorithm: explainable advisory risk classification

The risk engine is implemented in `src/modules/risk/riskEngine.js`. It evaluates five MVP risk dimensions on a 0-3 scale:

1. data sensitivity;
2. impact on clients or employees;
3. AI autonomy;
4. risk from limited human oversight; and
5. risk from limited vendor assurance.

The current version uses equal weights. The factor contributions are summed and mapped to preliminary tiers:

- 0-4: Low
- 5-8: Moderate
- 9-12: High
- 13-15: Restricted

The design also includes mandatory escalation rules. A numeric score can therefore be raised to a higher tier when a combination represents a higher governance concern than the total alone would indicate. Current escalation examples are:

- high impact plus high AI autonomy -> Restricted;
- sensitive data plus limited vendor assurance -> at least High;
- high impact plus limited human oversight -> at least High.

The output retains the algorithm version, numeric score, tier, individual factor contributions, contributing high-risk factors, and any escalation rules that fired. This supports the project's explainability and auditability objectives.

The risk tier is explicitly advisory. It routes and prioritizes human review; it never approves or rejects an AI use case.

## Human decision workflow

The decision logic is implemented in `src/modules/workflow/workflow.js`. It enforces several governance rules:

- only Reviewer and Administrator roles may record a final decision;
- a requester cannot approve or reject their own request;
- the only final MVP decisions are Approved, Conditional, and Rejected;
- final decisions require a reviewer rationale;
- decision records include the reviewer and timestamp;
- audit events capture the request, actor, action, status transition, context, and timestamp.

These rules preserve human accountability and separation of duties while creating structured evidence for later audit and reporting.

## Output validation

A repeatable command-line demonstration is available in `scripts/demo-core-logic.js` and can be run with:

```bash
npm run demo:logic
```

The demonstration evaluates a synthetic high-risk AI use case, records a conditional human decision, and creates the related audit event.

## Implementation challenges and resolution

The most important implementation challenge was balancing simplicity with governance safeguards. A pure score is easy to understand, but a total can hide important combinations. For example, high autonomy and high individual impact should receive stronger review even when other factors are low. Mandatory escalation rules were therefore added without introducing machine learning or opaque logic.

A second challenge was preserving the project's human-in-the-loop design. The risk engine and final-decision functions are deliberately separate modules. Tests verify that advisory scoring cannot substitute for an authorized reviewer and that the reviewer must provide a rationale.

## Current limitations

This remains an academic MVP. The current risk weights and thresholds are preliminary and require later stakeholder validation. Authentication is still simulated in the browser prototype, persistence still uses localStorage in Unit 4, and the production-oriented PostgreSQL/OIDC implementation remains future work.
