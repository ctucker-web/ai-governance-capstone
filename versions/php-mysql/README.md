# PHP/MySQL Version

Separate implementation of the AI Governance MVP for existing Apache/PHP/MySQL hosting. The original Next.js/PostgreSQL Version remains in the repository root; see [version register](../../VERSIONS.md).

## Architecture and requirements

PHP 8.3+ with PDO MySQL and mbstring, MySQL-compatible InnoDB database, HTTPS and PHP sessions. The React interface is compiled locally; the host does not run Node, Prisma, a container, or a persistent application process. No paid hosting upgrade is required for this architecture.

The shared interface and risk catalog come from the original implementation. PHP independently validates requests, computes advisory risk, enforces organization/role/ownership rules, and records human decisions. Database tables store users, policies, use-case aggregates, historical snapshots and an HMAC-linked audit log. Transactions serialize organization writes and reject stale workflow revisions. Policy changes do not rewrite earlier assessments.

## Build and configure

From the repository root, install the pinned Node dependencies with `pnpm install --frozen-lockfile`, then run `node versions/php-mysql/build.mjs`. Node is a build tool only.

Copy `config.example.php` to `config.local.php` inside the private application directory. Set the database DSN, user and password, a randomly generated audit key (at least 32 characters), and the canonical application URL including `/ai/`. Keep this file outside the document root. Alternatively set `GOVERNANCE_CONFIG` to its absolute path. Enable `demo_enabled` only for a synthetic demonstration. Anyone using the demo can select any demonstration role.

Run with the host's PHP 8.3+ executable:

```sh
php bin/console.php migrate
php bin/console.php seed
php bin/console.php verify-audit
```

Migration creates only `governance_*` tables. Seed preserves existing records and policies; do not run multiple seed processes concurrently. An interrupted example seed may leave a draft that can be completed in the interface.

## DreamHost deployment layout

Generate a secret-free package with `node versions/php-mysql/package.mjs`. Upload `private/` contents to `/home/chrrai4/ai-governance-php/` and `public/` contents to `/home/chrrai4/changedevelop.org/ai/`. The package includes `deployment-path.php` pointing to that private bootstrap. For another account, change this path before upload. Never upload the whole repository, `.env`, local databases, or private configuration into the website directory.

Create a separate application database in the existing hosting plan. Put its credentials in the private configuration, restrict configuration permissions to its owner, run migration and seed, then verify `/ai/api.php?resource=health` and the complete browser scenario over HTTPS. Preserve the existing WordPress files and database. If the host redirects www to the bare domain, use the final canonical origin in `app_url`.

Deploy only after tests pass. Back up the application database before upgrading. To roll back code, restore the previous application directories; retain the database and audit history. Schema upgrades beyond initial creation require an explicit migration plan.

## Validation

```sh
pnpm lint
pnpm typecheck
pnpm test
node versions/php-mysql/build.mjs
php tests/run.php
php /path/to/phpstan.phar analyse -c phpstan.neon --memory-limit=512M
# GOV​ERNANCE_CONFIG must point to a database ending in _test:
php tests/run.php --integration
```

The PHP commands above run from this version directory. Integration tests add synthetic records and retain history. They never drop or truncate tables. A tampering check temporarily changes one test-only audit row, then restores it in a finally block. Never run them against deployment data.

For browser checks serve `public/` at `http://localhost:3200/ai/` with a test-only configuration using the same URL, then from the repository root run `pnpm exec playwright test --config versions/php-mysql/playwright.config.ts`. Tests cover the clinical scenario from intake through conditional approval, evidence, mitigation completion and reassessment; policy versioning; HTTP protection; and mobile intake. PHPStan checks PHP 8.3 compatibility at level 5; TypeScript checks the browser source.

Local verification: PHP 8.5.11 / MariaDB 11.4.8, 37 PHP checks and 4 browser tests passed. PHPStan level 5 and TypeScript passed. Actual DreamHost deployment is still pending; MySQL 8 / PHP 8.3 validation must run in CI before claiming those environments verified.

## Known limitations and roadmap

- Demo identity selection is not production authentication. Add an independently verified OIDC adapter and account lifecycle management before using real organizational data.
- No confidential document upload; evidence stores reference links and metadata.
- Shared-host audit integrity uses HMAC chaining and append-only application operations, not PostgreSQL triggers. A database administrator can alter stored data; someone with both database and audit-key access can forge the chain. Tail deletion cannot be detected without an independently retained checkpoint. Add external signed checkpoints and restricted database accounts for stronger assurance.
- Aggregate JSON records simplify shared-host deployment but limit SQL reporting. Normalize analytical tables and add database migration versioning as scale grows.
- Writes serialize per organization; add pagination, concurrency load tests, rate limits and operational monitoring before wider use.
- Notifications, federated production login, automated retention, document malware scanning and external model integrations are future work. Assessment remains advisory; humans decide.
- Platform version 3 is reserved for a separately agreed implementation. This PHP/MySQL Version does not replace version 1.
