# Human User Acceptance Testing — initial formative feedback (Unit 7)

## Evidence and scope
- Six live human UAT sessions have been completed for the PHP/MySQL AI Governance demonstration at https://www.changedevelop.org/ai/.
- The session instrument uses five user tasks (intake, interpretation, independent review, record history, follow-up) and a locally designed feedback scale.
- The supplied PDF is a **blank reference instrument**, not scanned copies of the six completed participant worksheets. Detailed task outcomes, timing, and questionnaire entries were not supplied for auditing.
- Five quick-rating values were reported: **2, 3, 3, 3, 3**. The sixth value and mapping to participant/question are unavailable; do not call this a six-person average, SUS score, or validated task-success rate.
- More experienced users reportedly navigated successfully; less-experienced/younger testers requested additional guidance and expressed lower confidence. This is a small qualitative observation, **not** evidence of a generalizable age effect.

## Main finding: the Requester starting point is difficult to discover
Several people could not readily determine how to begin from the Requester perspective. This is a usability/adoption problem rather than evidence that the advisory risk algorithm failed.

## Required near-term MVP UX improvements
1. Give the Requester dashboard an unmistakable **Start New Assessment** primary action placed at the top of the screen. Keep one primary call-to-action.
2. Add a brief introduction explaining the intake, risk questions, submission, and human review sequence; optionally include a short 3-step progress indicator.
3. Ensure names of actions and task prompts are aligned. In future UAT instruments rename T1 from **Submit Proposal** to **Submit Assessment**. Do not silently reinterpret old task results.
4. Clarify progress and confirmations (draft saved, submitted for human review, current owner/next step).
5. Provide short field-level guidance and link back to the dashboard, without adding additional governance questions.
6. Ensure keyboard accessibility and plain-language labels.

## Acceptance criteria / follow-up UAT
- Requester can identify and select the Start New Assessment entry point without facilitator prompting.
- Test a new build with at least six similarly diverse volunteers, recording independent/assisted/incomplete/blocked outcomes for every task plus durations.
- Measure independent task completion using I/(I+A+N); preserve and report blocked tasks separately.
- Collect all feedback answers for all respondents and report any missing entries transparently.
- Recheck the **90% independent core-task completion goal** from the capstone; it has **not** yet been established by the supplied evidence.
- No claim of release completion until implementation and retest results are recorded.

## Priority and traceability
High-priority perfective maintenance / MVP usability change. This is separate from future Version 2 reviewer-drift detection or AI automation-bias analytics. Keep test data synthetic and do not introduce production identity claims.