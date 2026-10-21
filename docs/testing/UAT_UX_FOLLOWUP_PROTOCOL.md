# Human UAT follow-up — Requester guidance

**Status:** protocol for a future study; no follow-up participants or outcomes have been recorded. This is a companion to [the unchanged original findings](UNIT7_HUMAN_UAT_FINDINGS.md) and [Issue #6](https://github.com/ctucker-web/ai-governance-capstone/issues/6).

## Purpose and participants

Evaluate whether a first-time Requester can find the starting point, understand the process, complete an assessment, and recognize successful submission. Recheck the existing five task areas: intake, interpretation, independent review, record history, and follow-up.

Recruit at least six volunteers with varied familiarity with forms, software, and governance work. Record relevant self-reported experience rather than assuming that age explains performance. Explain that the software is being evaluated, participation is voluntary, and they may stop. Assign anonymous participant IDs; do not publish names or identifiable recordings.

Use the same frozen application build, policy, task wording, and fictional scenario across the group. Record the commit, URL, browser, viewport/device, input method, date, and facilitator. Include desktop and approximately 375px mobile use, and a keyboard-only session where feasible; record these differences when comparing results. Accommodate assistive technologies and document the actual setup.

The six original sessions are qualitative evidence. Their completed worksheets, task timings, and full scenario handout are unavailable in the repository. This protocol uses the existing PHP/MySQL clinical-documentation acceptance scenario to preserve the established core workflow. If the original scenario handout becomes available, reconcile it before recruiting and document any differences; do not claim a controlled before/after comparison from unavailable baseline data.

## Preparation

1. Use an approved synthetic demonstration or test installation of the reviewed build. Confirm that its current frontend assets are the intended build; an open pull request does not update the hosted demonstration.
2. Check that all five synthetic identities and the baseline policy are available, that the clinical scenario routes to Taylor Chen, and that no real personal, employee, client, or confidential data is present.
3. Give each participant a unique suffix such as `UAT-P01`. Start in a fresh browser context at identity selection. Preserve each completed record and its audit history; do not delete records to reset a session.
4. Read the task verbatim. Let the participant navigate without a tour or a demonstration of the starting button. Encourage a natural account of what they expect, without directing their clicks.
5. Agree on a consistent assistance rule before the study: help when requested or after a five-minute stall. Record the time and exact prompt whenever help is given. A short clarification that tells a person where to click counts as assistance.

## Fictional scenario handout

These are category descriptions for an imaginary organization, not actual health information. Do not paste a sample clinical note or any real person's details.

| Field | Fictional information |
| --- | --- |
| Assessment name | Clinical documentation — `UAT-P01` (use the assigned suffix) |
| Department | Programs |
| AI tool / product | Synthetic Note Assistant |
| Vendor | Example Vendor |
| Business purpose | Help staff prepare accurate draft notes. |
| Description of use | Draft documentation for human review. |
| Area of use | Clinical |
| Tool users | Program clinicians |
| People affected | Program participants |
| Data category | Client health |
| Work supported | Draft documentation only |
| AI autonomy | No independent decisions |
| Human oversight | Every note is verified by a clinician. |
| Vendor and safeguards | Assurance review is pending; no data is used for training. |

For the risk questions, use the options that describe highly sensitive data, significant impact on people, no independent AI decisions, verification of every output, limited/pending vendor assurance, some transparency, basic privacy/security safeguards, and substantial legal/regulatory exposure. The facilitator's reference answers are `3, 3, 0, 0, 2, 1, 1, 3` in the current eight-factor order. Do not replace the participant's interpretation with a score tutorial before observing their attempt. Record ambiguity and assistance.

## Tasks and success evidence

### T1 — Submit Assessment

**Task:** "Using the fictional information provided, start a new AI assessment, complete the required questions, and submit it for human review."

Select the Requester identity before starting the task timer. Do not identify the starting button for the participant. Record the first clicked target and the time from the loaded dashboard to an independent start attempt. The approximately five-second discovery objective is a future design target, not an observed result.

Success requires a persisted assessment with the actual identifier and an Under Review status. Saving a draft alone does not complete T1. After the task, ask without leading: "How did you know it was submitted?" and "What happens next?" Record whether the participant distinguishes advisory software scoring from a human decision.

The facilitator must record:

- whether the participant found the starting point independently;
- whether assistance was needed, when it began, and what was said;
- where the participant first clicked;
- whether the participant understood the assessment steps;
- whether the participant understood the submission confirmation;
- task completion time, including time before any assistance;
- confusion, hesitation, unexpected navigation, and the participant's own words.

### T2 — Interpret the assessment

**Task:** "Open the assessment you submitted. Explain its risk classification, one reason for that classification, and who makes the final decision."

Success requires identifying the advisory High classification and a displayed contributing factor or escalation reason, recognizing that it is not approval, and identifying the assigned human reviewer. Do not supply the interpretation before recording the attempt.

### T3 — Independent human review

**Task:** "Switch to the assigned reviewer identity. Find this assessment, add the fictional evidence reference, and record conditional approval with a reason and the required safeguard."

Provide these reviewer facts: evidence URL `https://example.com/synthetic-assurance`; description "Synthetic vendor review supports restricted use"; rationale "Human verification and restricted data handling make this use acceptable with conditions"; mitigation "Human verification required before AI-generated content enters the official record." Use Alex Morgan as the owner and a future date supplied consistently for the session. The reference is a fictional example, not an assurance source to rely on.

Success requires the assigned independent reviewer to persist the conditional decision, rationale, and mitigation. Attempting this as the Requester must not succeed. Observe review-queue discovery and whether the participant understands why a rationale and mitigation are required.

### T4 — Retrieve the governance record

**Task:** "Switch to the Auditor identity. Find the conditionally approved assessment and show its decision rationale, evidence reference, and history."

Success requires finding the authorized record and its recorded events without modification privileges. Record the path used and any difficulty distinguishing the record's current state from its historical assessments.

### T5 — Follow-up and reassessment

**Task:** "Return to the Requester identity. Complete the assigned safeguard with a note. Then start and submit a reassessment because the vendor model changed, and show that the earlier assessment remains available."

Provide completion note "Every draft is reviewed under the documented procedure" and reassessment reason "Vendor model changed; reassess before continued use." Retain the same fictional intake and risk answers. Success requires persisted mitigation completion, a new submitted assessment version, and visibility of the prior version in History. Do not delete or rewrite the earlier decision.

## Observation worksheet — one per participant

Participant ID: ____  Build/commit: ____  Date: ____  Facilitator: ____

Browser/device/viewport: ____  Input/assistive technology: ____

Relevant software/governance experience (optional, self-reported): ____

| Task | Outcome I/A/N/B | Start / finish | Total seconds | Seconds before first help | Assistance or blocker | Observed success evidence / hesitation |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | | | | | | |
| T2 | | | | | | |
| T3 | | | | | | |
| T4 | | | | | | |
| T5 | | | | | | |

T1 first clicked target: ____  Seconds to start attempt: ____

T1 found starting point independently: yes / no / not observed

Understood steps: yes / partly / no / not observed. Evidence: ____

Understood confirmation and next human-review step: yes / partly / no / not observed. Evidence: ____

Optional locally designed feedback, answered separately (1 = strongly disagree; 5 = strongly agree):

| Statement | Response 1–5 or missing | Participant comment |
| --- | --- | --- |
| I knew where to start. | | |
| I understood what the assessment asked me to do. | | |
| I could tell where I was in the process. | | |
| I knew whether my assessment had been submitted. | | |
| I understood what happens after submission. | | |

This is a local feedback questionnaire, not the System Usability Scale. Preserve individual missing answers; never fill them from other respondents or combine them with the five unmapped original quick ratings.

## Outcome coding and reporting

- **I — Independent:** completed with the required persisted evidence, without navigation or task help.
- **A — Assisted:** completed after any facilitator guidance. Record total time and time before the first help separately.
- **N — Not completed:** the application was available, but the participant stopped or did not complete the task. Record elapsed time and reason; do not include it as a successful completion time.
- **B — Blocked:** an application/environment problem prevented a valid attempt. Record the blocker and time; do not silently count it as independent, assisted, or user failure.

Report all I/A/N/B counts for each task, the participant count, missing observations, and any excluded/aborted sessions. Calculate independent completion as **I / (I + A + N)**; report B separately with its denominator. Also report assisted completion separately and, if useful, overall completion `(I + A) / (I + A + N)` under that distinct label. If a denominator is zero, report "not measurable."

Report times separately for independent and assisted successes, including the number of observations, median, and range. Preserve incomplete/blocked elapsed times as separate observations. Do not mix timings from different devices or task protocols without identifying those differences.

The **90% independent core-task completion target remains a future evaluation goal**. Apply it to the five predefined tasks using the stated denominator, report task-level results as well as the aggregate, and inspect every failure or blocker. Do not substitute a functional-test pass rate or satisfaction rating for this human outcome. A small volunteer study does not establish broad nonprofit usability or an age-related cause.

Keep these new records separate from the original six-person findings. Publish only de-identified results with build details, protocol deviations, limitations, and next changes. Issue #6 includes human retesting in its definition of done; passing automated UX tests alone does not complete that research follow-up.
