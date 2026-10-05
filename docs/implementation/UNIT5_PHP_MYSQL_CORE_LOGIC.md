# Unit 5 PHP/MySQL Core Logic and Testing

The PHP/MySQL implementation on `feature/php-mysql-version` is the selected implementation track for the remainder of the MSIT 5910 capstone.

## Core logic

The central algorithm is `Governance\assess()` in `versions/php-mysql/app/domain.php`. It validates eight 0-3 risk answers, applies configurable weights and thresholds, and evaluates mandatory escalation rules. It returns an advisory tier of LOW, MODERATE, HIGH, or EXECUTIVE_EXCEPTION together with factor-level contributions and triggered rules. The score never records the final governance decision.

Human review logic is enforced in `versions/php-mysql/app/workflow.php`. Only the assigned independent reviewer may record a final decision, rationale is required, conditional approval requires at least one mitigation, stale revisions are rejected, and failed transactions roll back.

## Testing

`versions/php-mysql/tests/run.php` contains 16 unit-level checks covering score boundaries, escalation rules, invalid input, threshold ordering, and invalid dates. The `--integration` option expands the suite to 37 PHP checks covering persistence, role/ownership restrictions, self-approval prevention, decision rollback, evidence, mitigations, reassessment, policy versioning, and audit-chain tamper detection.

GitHub Actions run 36177575696 passed on PHP 8.3/MySQL 8 with:
- 37 PHP checks passed;
- 4 Playwright browser acceptance tests passed;
- PHP syntax validation passed;
- PHPStan level 5 passed;
- TypeScript/ESLint checks passed;
- production browser assets and deployment package generated successfully.

## Milestones

- `php-mysql-v0.1.0-initial` - initial PHP/MySQL implementation.
- `php-mysql-v0.2.0-tested` - tested MVP milestone with successful PHP 8.3/MySQL 8 CI.

These releases preserve specific points in repository history while the PHP/MySQL branch continues through later capstone units.
