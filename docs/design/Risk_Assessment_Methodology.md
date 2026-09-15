# Preliminary AI Risk Assessment Methodology

## Purpose

The MVP will use a transparent, rule-based assessment to support human governance review. The risk classification will not autonomously approve or reject an AI use. Its purpose is to identify relevant risk factors, create a repeatable preliminary classification, and route the request to appropriate reviewers.

## Preliminary Risk Dimensions

1. **Data sensitivity** — whether the use involves public, internal, confidential, personally identifiable, health, financial, employment, or similarly sensitive information.
2. **Impact on people** — whether outputs could materially influence services, care, employment, access, eligibility, safety, rights, or other consequential outcomes.
3. **AI autonomy** — whether the system only assists a human, recommends actions, makes decisions, or acts automatically.
4. **Human oversight** — whether a qualified person can understand, review, challenge, and override the AI output before consequential action occurs.
5. **Vendor and security assurance** — availability of information about security controls, privacy practices, retention, model behavior, incident handling, and contractual protections.
6. **Transparency and explainability** — whether the purpose, limitations, data use, and basis of relevant outputs can be meaningfully communicated to users and reviewers.
7. **Regulatory and policy exposure** — whether the use operates in a regulated or high-consequence area or conflicts with an organizational prohibition.

## Preliminary Classification

The MVP will begin with four governance outcomes:

- **Low risk** — routine review may be sufficient.
- **Moderate risk** — additional departmental and IT/security review is required.
- **High risk** — cross-functional review is required, potentially including privacy, compliance, security, legal, clinical/program leadership, or executive oversight.
- **Prohibited / redesign required** — the proposed use conflicts with a defined organizational red line or cannot be reduced to an acceptable risk through mitigation.

## Design Principles

- Every classification must retain its contributing risk factors.
- A numerical score, if used, is decision support rather than a substitute for professional judgment.
- High-impact uses require stronger human oversight and evidence.
- Missing vendor evidence should increase scrutiny rather than be treated as evidence of safety.
- Reviewers must be able to document exceptions, mitigation requirements, and rationale.
- The methodology should be configurable so a nonprofit can adapt thresholds and review rules to its mission, regulations, and risk tolerance.

## Validation Plan

The methodology will be tested with synthetic scenarios representing low-, moderate-, and high-risk nonprofit AI uses. Expected classifications will be compared with system results. Usability testing will also examine whether reviewers can understand why a classification was produced.
