# AI Governance Risk and Approval Platform

MSIT 5910 Capstone Project

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

## Planned MVP Modules

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
  frontend/           Browser-based user interface
  backend/            Application services and APIs
  database/           Database schema and migration assets

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

Current phase: **System Architecture and Detailed Design (MSIT 5910 Unit 3)**

## Academic Context

University of the People  
Master of Science in Information Technology  
MSIT 5910 Capstone Project

## Public-Interest Goal

The long-term goal is to make a sanitized version of the MVP available to nonprofit organizations through a hosted demonstration, open-source code, implementation documentation, or a combination of these approaches.

## License

A final open-source license will be selected before public release of the reusable MVP. Until then, no additional redistribution rights are granted beyond those provided by applicable law.
