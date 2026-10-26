# AI Governance Risk and Approval Platform — Capstone Portfolio

**Christopher Tucker | MSIT 5910 Capstone Project | University of the People**

## The problem
Nonprofit organizations increasingly use AI-enabled tools but may lack a reliable way to register those uses, review privacy and operational risks, document accountable approval, and revisit decisions as conditions change.

## The solution
I designed and implemented a lightweight **AI Governance Risk and Approval Platform** that translates AI oversight principles into a traceable workflow:
**AI use-case intake → eight-factor advisory risk assessment → human review → decision and rationale → mitigation and evidence → audit history → reassessment.**

The algorithm is **advisory only**. A designated human reviewer makes the final decision. The system is intended as an academic prototype and uses synthetic demonstration data; it is **not production-approved for sensitive organizational records**.

### Explore the project
- **[Live PHP/MySQL demonstration](https://www.changedevelop.org/ai/)** (synthetic roles/data; not production authentication)
- **[Source repository](https://github.com/ctucker-web/ai-governance-capstone)**
- **[Current PHP/MySQL code and developer instructions](https://github.com/ctucker-web/ai-governance-capstone/tree/feature/php-mysql-version/versions/php-mysql)**
- **[System requirements](https://github.com/ctucker-web/ai-governance-capstone/blob/main/docs/requirements/SRS.md)**
- **[System design](https://github.com/ctucker-web/ai-governance-capstone/blob/main/docs/design/Software_Design_Document.md)**
- **[Versioned technical tests](https://github.com/ctucker-web/ai-governance-capstone/tree/feature/php-mysql-version/versions/php-mysql/tests)**
- **[Verified Unit 7 GitHub Actions run](https://github.com/ctucker-web/ai-governance-capstone/actions/runs/38627730157)**

## My contributions and skills demonstrated
- Problem definition, literature-informed governance requirements, and research limitations
- Modular monolith architecture; **PHP 8.3, MySQL/InnoDB, React/TypeScript**, and PHP REST-style endpoints
- Deterministic and explainable eight-dimension risk scoring and mandatory escalation rules
- Server-side role and ownership authorization, independent reviewer rationale, transactions, assessment snapshots, and HMAC-linked audit history
- Git branching, pull requests, documented milestones, and automated CI checks
- Human-centered evaluation: six formative UAT sessions yielded clearer Requester entry-point requirements; the follow-up navigation changes and retest remain a tracked improvement effort

## Evidence and limits
The October 14, 2026 GitHub Actions run reported **44/44 PHP checks and 4/4 Playwright browser tests passing**. These synthetic technical tests do not establish real-world risk-score validity, production identity security, or universal usability.

Six human UAT sessions were conducted. Participant feedback indicated some inexperienced users had difficulty locating where to start in the Requester role. The planned improvement is a clear **Start New Assessment** action and guided first-time workflow. A measured independent task-success percentage is **not claimed** without complete coded task outcomes.

## Design evolution
Initial exploration used a Next.js/PostgreSQL architecture. The capstone then adopted PHP/MySQL to support deployment on conventional shared hosting, while preserving earlier work in version control.

## Planned publication improvements
- Add a short, captioned demonstration video and a final sanitized technical report after academic review.
- Add selected annotated screenshots and an accessible one-page case-study summary.
- Document the WordPress-plugin adaptation as a **separate development track**, not as a finished component.
- Retest the revised Requester experience and publish coded, non-identifying aggregate findings.

## Privacy and responsible reuse
No passwords, private environment configurations, real client information, staff records, protected health information, or signed participant worksheets belong in this public portfolio. WordPress integrations and real-world organization deployments require separate identity, security, and privacy validation.

*Portfolio page published from the public GitHub repository. This is a project showcase rather than a separately configured GitHub Pages website.*
