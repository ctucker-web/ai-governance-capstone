# Future work

MVP v1 demonstrates the complete governance lifecycle with human decision authority. The following are intentionally deferred and must not delay MVP evaluation.

## Before any real organizational deployment

- Implement and security-test an OIDC provider adapter, including issuer/audience/signature validation, state, nonce, PKCE, account mapping, and session lifecycle.
- Disable demo identity selection; provision real organizational roles with an accountable administrator.
- Use separate migration and least-privilege runtime database accounts, encrypted connections, managed secrets, tested backup/restore, rate limiting, and a reviewed CSP without development allowances.
- Complete representative-user usability evaluation, assistive-technology testing, threat modeling, dependency review, and operational acceptance.
- Review policies and escalation thresholds with the adopting organization's responsible leaders; the defaults are demonstration assumptions, not validated legal or clinical standards.

## Version 2.0 opportunities

- Reviewer automation-bias monitoring and reviewer override-rate analysis.
- Periodic reviewer calibration and blind reassessment exercises.
- Policy-to-control mapping and richer organization-specific frameworks.
- Vendor assessment imports and automated evidence reminders.
- Multi-tenant SaaS architecture with strengthened tenant-isolation controls.
- Optional generative-AI governance assistant and document summarization, always with human verification.
- External APIs, production notifications, richer analytics, and scheduled reminder jobs.
- Multiple concurrent reviewer stages, delegations, and executive exception sign-off roles.
- Archive recovery, fuller versioned draft editing, pagination, and accessible deep links to individual records.

Reviewer-behavior analysis, calibration, automation-bias detection, clinical integrations, hiring integrations, autonomous governance decisions, billing, and vendor API integrations are not implemented in v1.
