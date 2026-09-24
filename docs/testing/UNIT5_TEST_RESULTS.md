# Unit 5 Unit Test Results

## Framework and test approach

The Unit 5 modules use the Node.js built-in `node:test` framework with `node:assert/strict`. This avoids adding unnecessary third-party dependencies while providing repeatable automated unit tests.

Both black-box and white-box tests are used.

- **Black-box tests** validate observable behavior at module boundaries without depending on internal implementation details. Examples include verifying that a score of 5 produces Moderate risk and that a Requester cannot record a governance decision.
- **White-box tests** deliberately exercise known branches and safeguards inside the implementation. Examples include testing mandatory escalation rules and the separation-of-duties rule that prevents a requester from approving their own request.

## Test coverage

### Risk engine

Tests verify:

- Low-risk boundary behavior;
- Moderate-risk threshold at score 5;
- High-risk threshold at score 9;
- Restricted escalation for high autonomy plus high impact;
- High-risk escalation for sensitive data plus limited vendor assurance;
- retention of contributing-factor explanations;
- rejection of invalid factor values outside the 0-3 range.

### Workflow and audit logic

Tests verify:

- Requesters cannot record final decisions;
- Reviewers can record final decisions;
- requester/reviewer separation of duties;
- final decisions require rationale;
- decision records store the decision, rationale, reviewer, and timestamp;
- audit events contain actor, action, status transition, and timestamp.

## Execution

Run the test suite with:

```bash
npm test
```

For a more readable console report:

```bash
npm run test:verbose
```

## Validation result

The initial Unit 5 execution completed successfully with 13 of 13 tests passing and zero failures.

```text
✔ black-box: minimal inputs produce Low advisory risk
✔ black-box: score of 5 produces Moderate risk
✔ black-box: score of 9 produces High risk
✔ white-box: high autonomy plus high impact forces Restricted escalation
✔ white-box: sensitive data plus weak vendor assurance raises minimum tier to High
✔ white-box: factor explanations are retained for transparency
✔ input validation rejects risk values outside 0-3
✔ black-box: requester cannot record a governance decision
✔ black-box: reviewer can record a governance decision
✔ white-box: requester and reviewer cannot be the same person
✔ black-box: final decision requires reviewer rationale
✔ decision record stores rationale and timestamp
✔ audit event captures actor, action, status transition, and time

Tests: 13
Passed: 13
Failed: 0
```

## Issues identified through testing

Unit testing exposed two design areas that required explicit safeguards rather than relying on user-interface behavior. First, authorization needed to be represented directly in decision logic so a Requester could not make a final decision merely by invoking the function outside the UI. Second, a final decision required programmatic validation of reviewer rationale. These checks were therefore placed in the workflow module rather than relying on front-end controls alone.

The tests also reinforced the need for mandatory escalation rules in addition to numeric thresholds. This ensures certain combinations of factors receive stronger review even when the simple total would otherwise produce a lower classification.

## Reliability and modularity

Unit tests improve reliability by detecting regressions close to the module where they originate. The risk engine can evolve independently from the user interface, while the workflow module can be strengthened without rewriting risk calculations. This modular structure also supports future migration from the current browser MVP to the planned TypeScript/PostgreSQL application.
