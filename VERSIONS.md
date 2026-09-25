# Platform versions

The platform will have at least three distinct implementations. Versions are preserved independently; a new implementation does not silently replace a previous one.

| Version | Name | Status | Source |
| --- | --- | --- | --- |
| 1 | Next.js/PostgreSQL Version | Verified working MVP: 63 tests, production build and Docker CI passed | Root application; tag `platform-v1-nextjs-postgresql`; commit `d28af42f4c025aa67d5e4303b034c28760143c9b`; PR #4 |
| 2 | PHP/MySQL Version | 37 PHP checks and 4 browser tests pass on PHP 8.3/MySQL 8 CI; files uploaded to DreamHost, database configuration pending | `versions/php-mysql/`; branch `feature/php-mysql-version`; PR #5; target `https://www.changedevelop.org/ai/` |
| 3 | To be defined | Reserved; requirements and technology not yet chosen | No implementation claimed |

Version 1 uses a Node.js application server and PostgreSQL. The PHP/MySQL Version runs PHP per request and uses the existing MySQL hosting allowance, with prebuilt browser assets and no persistent Node.js process. It reuses the established UI, workflows and advisory scoring rules. Its server implementation, schema, deployment package and validation are separate.

DreamHost shared MySQL cannot create the PostgreSQL history-protection triggers. The PHP/MySQL Version must explicitly document and test its application-level append-only history controls; these are not equivalent to PostgreSQL database-enforced immutability.

Original standalone Unit 4 HTML is a historical prototype, not one of these completed server-backed versions. No paid hosting has been purchased.
