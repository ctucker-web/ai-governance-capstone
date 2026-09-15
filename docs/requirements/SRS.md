# Software Requirements Specification (SRS)

## AI Governance Risk and Approval Platform

### 1. Purpose

The platform will provide nonprofit organizations with a consistent and auditable workflow for identifying, assessing, approving, documenting, and monitoring artificial intelligence use cases.

### 2. Scope

The minimum viable product (MVP) will support structured AI use-case intake, a centralized AI inventory, explainable risk assessment, human review and approval, evidence and mitigation tracking, audit history, reporting, and reassessment tracking.

The MVP will not perform autonomous clinical, employment, legal, or compliance decisions. Development and testing will use synthetic or de-identified data only.

### 3. Stakeholders

- Executive leadership
- Information technology
- Compliance and privacy
- Clinical or program leadership
- Human resources
- Finance
- Department managers
- Employees proposing AI uses
- Nonprofit organizations that may reuse the public MVP

### 4. Functional Requirements

- **FR-01 User authentication:** The system shall authenticate users before allowing access to protected functions.
- **FR-02 Role-based access:** The system shall restrict functionality based on assigned roles.
- **FR-03 AI use-case intake:** The system shall allow authorized users to submit a proposed AI use case using a structured form.
- **FR-04 AI inventory:** The system shall maintain a searchable inventory of submitted and approved AI systems/use cases.
- **FR-05 Risk assessment:** The system shall collect structured risk information including data sensitivity, affected populations, autonomy, human oversight, vendor controls, transparency, and regulatory exposure.
- **FR-06 Risk classification:** The system shall produce a preliminary, explainable risk classification using documented rules.
- **FR-07 Review routing:** The system shall route submissions to appropriate human reviewers based on risk and organizational policy.
- **FR-08 Decision recording:** The system shall record approval, conditional approval, rejection, rationale, reviewer, and decision date.
- **FR-09 Evidence tracking:** The system shall allow reviewers to record supporting evidence and required mitigation actions.
- **FR-10 Audit history:** The system shall maintain an immutable or append-oriented history of key governance events.
- **FR-11 Reporting:** The system shall provide management views and reports showing inventory, risk status, review status, and outstanding mitigations.
- **FR-12 Reassessment:** The system shall support scheduled or recorded periodic reassessment of approved AI uses.

### 5. Non-Functional Requirements

- **NFR-01 Security:** Protected functions shall require authenticated access and role-based authorization.
- **NFR-02 Privacy:** The MVP shall not require PHI or production PII for development or testing.
- **NFR-03 Explainability:** Risk classifications shall expose the contributing factors or rules used to generate the classification.
- **NFR-04 Usability:** Primary workflows shall be understandable to nontechnical nonprofit staff with minimal training.
- **NFR-05 Reliability:** Core submission and decision records shall persist consistently without data loss under normal operating conditions.
- **NFR-06 Performance:** Common interactive operations should return within approximately two seconds under MVP-scale test loads, excluding external services.
- **NFR-07 Maintainability:** The system shall use modular components, version control, documented interfaces, and readable code.
- **NFR-08 Scalability:** The design shall allow future expansion to additional organizations, risk frameworks, and workflow rules without redesigning the entire application.
- **NFR-09 Auditability:** Significant governance actions shall be attributable to a user and timestamp.

### 6. Constraints and Assumptions

- The capstone is limited to an eight-unit academic term.
- The project is being developed primarily by one student.
- The MVP will prioritize a complete end-to-end workflow over enterprise-scale integrations.
- Organization-specific policies and confidential materials will not be committed to the public repository.
- The platform supports human governance decisions; it does not replace accountable human reviewers.

### 7. Preliminary Success Criteria

- At least 90% of defined core functional test cases pass by Unit 7.
- All critical defects identified during testing are resolved before final submission.
- A user can complete the end-to-end workflow from intake through decision retrieval.
- Risk classifications are traceable to documented assessment criteria.
- The public repository contains only sanitized code, documentation, diagrams, and synthetic data.
