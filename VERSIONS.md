# Platform versions

The platform will have at least three distinct implementations. Versions are preserved independently; a new implementation does not silently replace a previous one.

| Version | Name | Status | Source |
| --- | --- | --- | --- |
| 1 | Next.js/PostgreSQL Version | Verified working MVP: 63 tests, production build and Docker CI passed | Root application; tag `platform-v1-nextjs-postgresql`; commit `d28af42f4c025aa67d5e4303b034c28760143c9b`; PR #4 |
| 2 | PHP/MySQL Version | **Selected implementation for the remainder of the MSIT 5910 capstone.** 37 PHP checks and 4 browser tests pass on PHP 8.3/MySQL 8 CI; files uploaded to DreamHost, database configuration pending | `versions/php-mysql/`; branch `feature/php-mysql-version`; PR #5; milestone tags `php-mysql-v0.1.0-initial` and `php-mysql-v0.2.0-tested`; target `https://www.changedevelop.org/ai/` |
| 3 | To be defined | Reserved; requirements and technology not yet chosen | No implementation claimed |

## Capstone implementation decision

Beginning with the core-logic and testing phase, the PHP/MySQL Version is the implementation track used for the remaining capstone assignments. The selection emphasizes simplified deployment on widely available Apache/PHP/MySQL hosting, compatibility with the existing DreamHost environment, and the developer's greater familiarity with PHP/MySQL. This reduces deployment complexity while preserving the same governance objectives, advisory risk logic, human-review safeguards, audit history, and testing expectations.

Version 1 remains preserved as a completed alternative architecture and historical comparison. It is not deleted or rewritten.

Version 1 uses a Node.js application server and PostgreSQL. The PHP/MySQL Version runs PHP per request and uses the existing MySQL hosting allowance, with prebuilt browser assets and no persistent Node.js process. It reuses the established UI, workflows and advisory scoring rules. Its server implementation, schema, deployment package and validation are separate.

DreamHost shared MySQL cannot create the PostgreSQL history-protection triggers. The PHP/MySQL Version therefore documents and tests application-level append-only history controls and an HMAC-linked audit chain; these are not equivalent to PostgreSQL database-enforced immutability.

Original standalone Unit 4 HTML is a historical prototype, not one of these completed server-backed versions. No paid hosting has been purchased.
