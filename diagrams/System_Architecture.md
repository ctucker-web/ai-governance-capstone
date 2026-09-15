# System Architecture Diagram

```mermaid
flowchart TB
    U[Users: Requesters / Reviewers / Admins / Leadership]
    UI[Web Application / Presentation Layer]
    AUTH[Authentication & RBAC]
    API[Application / API Layer]
    INTAKE[AI Use-Case Intake]
    INV[AI Inventory]
    RISK[Risk Assessment & Classification]
    REVIEW[Review & Approval Workflow]
    EVID[Evidence & Mitigation Tracking]
    AUDIT[Audit History]
    REPORT[Dashboard & Reporting]
    REASSESS[Reassessment Tracking]
    DB[(Relational Database)]
    NOTIFY[Notification / Reminder Service]

    U --> UI
    UI --> AUTH
    UI --> API
    AUTH --> API
    API --> INTAKE
    API --> INV
    API --> RISK
    API --> REVIEW
    API --> EVID
    API --> AUDIT
    API --> REPORT
    API --> REASSESS

    INTAKE --> DB
    INV --> DB
    RISK --> DB
    REVIEW --> DB
    EVID --> DB
    AUDIT --> DB
    REPORT --> DB
    REASSESS --> DB
    REASSESS --> NOTIFY
    REVIEW --> NOTIFY
```

## Architecture Rationale

The MVP uses a layered, modular web architecture. The presentation layer serves multiple user roles while authentication and role-based authorization protect governance functions. Business modules are separated logically so intake, inventory, risk classification, review, evidence, auditing, reporting, and reassessment can evolve independently while sharing a relational data layer. For the capstone, these logical modules may be deployed as a modular monolith to reduce operational overhead while maintaining clear module boundaries.
