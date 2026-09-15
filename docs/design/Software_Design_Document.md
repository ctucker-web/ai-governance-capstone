# Software Design Document

## AI Governance Risk and Approval Platform

### 1. Design Goals

The MVP is designed to translate AI governance principles into a practical, auditable workflow that is understandable to nonprofit staff and technically maintainable by a small IT team. The architecture favors modularity, explainability, security, and portability over unnecessary complexity.

### 2. High-Level Architecture

The initial solution will use a layered web architecture:

1. **Presentation layer** — browser-based interface for requesters, reviewers, administrators, and leadership.
2. **Application/API layer** — business rules, workflow logic, validation, risk classification, authorization checks, and reporting endpoints.
3. **Data layer** — relational persistence for users, organizations, AI systems, use cases, assessments, decisions, evidence, mitigations, and audit events.
4. **Identity/security services** — authentication, session/token handling, and role-based authorization.
5. **Reporting/notification services** — dashboards, status summaries, reassessment reminders, and future integrations.

For the capstone MVP, these logical modules may be deployed as a modular monolith to reduce operational complexity while preserving clear internal boundaries. The design can later evolve toward separately deployable services if scale or reuse requires it.

### 3. Major Modules

#### 3.1 Authentication and Authorization
**Input:** Credentials or identity-provider assertion; requested operation.  
**Method:** Authentication plus role/permission evaluation.  
**Output:** Authenticated session and allow/deny decision.

#### 3.2 AI Use-Case Intake
**Input:** Requester identity, business purpose, AI tool/system, data types, affected users, intended decisions, vendor information.  
**Method:** Structured form validation and record creation.  
**Output:** New governance request with unique identifier and status.

#### 3.3 AI Inventory
**Input:** Submitted systems/use cases and lifecycle status.  
**Method:** Search, filtering, normalization, and relationship mapping.  
**Output:** Central inventory of governed AI uses.

#### 3.4 Risk Assessment
**Input:** Structured responses covering data sensitivity, autonomy, human oversight, impact, transparency, vendor assurance, security, and regulatory exposure.  
**Method:** Configurable rule-based scoring and threshold evaluation.  
**Output:** Preliminary risk score/classification plus contributing factors.

#### 3.5 Review and Approval Workflow
**Input:** Request, risk classification, organizational routing rules.  
**Method:** Role-based workflow state transitions and reviewer assignment.  
**Output:** Review tasks, status changes, and final governance decision.

#### 3.6 Evidence and Mitigation Tracking
**Input:** Reviewer notes, evidence references, required safeguards, due dates.  
**Method:** Structured evidence and mitigation records linked to the request.  
**Output:** Traceable control requirements and remediation status.

#### 3.7 Audit History
**Input:** Significant user and system events.  
**Method:** Append-oriented audit event capture with timestamp and actor.  
**Output:** Chronological governance history.

#### 3.8 Reporting and Dashboard
**Input:** Inventory, risk, workflow, mitigation, and reassessment data.  
**Method:** Aggregation and filtering.  
**Output:** Management summaries, lists, and metrics.

#### 3.9 Reassessment
**Input:** Approved AI use, review interval, material change information.  
**Method:** Date/rule-based reassessment tracking.  
**Output:** Upcoming/overdue reassessments and updated governance records.

### 4. Preliminary Data Entities

- Organization
- User
- Role
- AISystem
- UseCase
- RiskAssessment
- RiskFactor
- Review
- Decision
- Evidence
- Mitigation
- AuditEvent
- Reassessment

### 5. Security Design

Security controls will include authenticated access, least-privilege role assignment, separation of requester and approver capabilities where appropriate, input validation, protected secrets, encrypted transport, audit logging, and synthetic test data. No API keys or production credentials will be stored in the repository.

### 6. Risk Classification Design Principle

The risk engine will be explainable and rule-based for the MVP. Each classification will retain the factors that contributed to the result. The classification is advisory and determines workflow/routing; it does not autonomously approve or prohibit an AI system.

### 7. Initial Workflow

```text
Submit use case
    ↓
Validate submission
    ↓
Complete risk assessment
    ↓
Calculate preliminary risk classification
    ↓
Assign required human reviewers
    ↓
Review evidence and mitigations
    ↓
Approve / conditionally approve / reject
    ↓
Record decision and audit trail
    ↓
Monitor mitigation and reassessment status
```

### 8. Future Evolution

Potential future capabilities include configurable tenant policies, vendor assessment imports, policy-to-control mapping, external APIs, automated evidence reminders, analytics, and optional generative-AI assistance. These are intentionally outside the initial MVP unless time remains after core requirements are complete.
