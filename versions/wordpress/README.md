# WordPress Plugin Version

Version 3 is an alternative packaging of AI Governance for an existing WordPress site. It uses the site's WordPress login, user accounts, capabilities, and database connection. Versions 1 and 2 remain separate implementations; this plugin does not import, replace, or deploy over the hosted PHP/MySQL app.

**Branch:** `feature/wordpress-plugin-version`, based on the tested Requester UX branch at `0f9cf2a`. **Delivery:** one generated PHP plugin file containing the PHP application, compiled React interface, styles, and risk catalog. Repository sources remain separated so changes can be reviewed and tested. See [implementation and verification notes](../../docs/implementation/WORDPRESS_PLUGIN_VERSION.md).

## Requirements

- A single-site WordPress installation, WordPress 6.6 or later, PHP 8.3 or later with `mbstring` and `mysqli`, and a MySQL/MariaDB database supporting InnoDB. PDO is not required by this version.
- HTTPS for a hosted installation, a normal WordPress administrator account, and permission to install plugins and create the plugin's own database tables.
- At least two separate WordPress accounts for a complete requester-to-reviewer workflow. A requester cannot decide their own assessment, including when they are also a WordPress administrator.

WordPress Multisite is not supported by this initial version. Use synthetic assessment content while evaluating it. Existing WordPress authentication does not by itself establish readiness to store confidential organizational information.

## Build the single-file plugin

From the repository root:

```sh
pnpm install --frozen-lockfile
node versions/wordpress/build.mjs
```

The build bundles the existing React components and PHP governance rules into one PHP file. It does not require Node.js on the WordPress host, a CDN, runtime extraction, a second application server, or a separate application database password. The ZIP contains only the plugin directory and its single PHP file; the generated release must be rebuilt whenever its source changes.

Outputs under `versions/wordpress/dist/` are:

- `ai-governance-wordpress.php` — the complete single-file plugin, named **AI Governance — WordPress Version**, version 0.1.0.
- `ai-governance-wordpress.zip` — installable ZIP containing exactly `ai-governance/ai-governance-wordpress.php`.
- `SHA256SUMS` — release file hashes for verification.

Do not upload the repository, `.env`, `.local`, test installation, development dependencies, or WordPress configuration.

## Install and configure access

1. Back up the WordPress database and test the plugin on a staging copy first. Keep the existing `/ai/` application in place.
2. In WordPress, open **Plugins → Add New Plugin → Upload Plugin**, select the generated ZIP, install it, and activate it. If installing the raw PHP file manually, place it in its own directory under `wp-content/plugins/` and activate it through WordPress.
3. Use **Users → All Users** to assign the appropriate governance role to each intended participant. Changing a user's WordPress role can remove their prior site permissions; use a separate account or an existing capability-management process when the person also needs an unrelated site role. Do not promote participants to WordPress administrator merely to grant governance access.
4. Open the **AI Governance** entry in the WordPress administration menu. The app uses the current account; there is no demonstration identity picker or separate platform password.
5. As an administrator, open **Administration** and assign an eligible, independent reviewer to every advisory tier. Save the policy. Initial activation deliberately does not route decisions to a fictitious reviewer or automatically create participant accounts.
6. Sign in as the requester in another browser profile, choose **Start New Assessment**, complete the fictional example, and submit it. Sign in as the assigned reviewer to record the human decision and rationale.

| WordPress role/capability | Platform access |
| --- | --- |
| AI Governance Requester / `aigwp_request` | Create and manage the account's own assessments and permitted follow-up work |
| AI Governance Reviewer / `aigwp_review` | Review assessments assigned to this account; a requester cannot review their own submission |
| AI Governance Auditor / `aigwp_audit` | Read approved governance records and their history under the existing visibility rules |
| WordPress Administrator / all four governance capabilities, including `aigwp_admin` | Manage policy and routing, access inventory, and use requester/reviewer functions subject to the same ownership and independent-review checks |
| Other WordPress roles without a governance capability | No governance workspace access |

The app opens through WordPress's authenticated `admin-post.php?action=aigwp_app` entry point. Its workspace API is under `/wp-json/ai-governance/v1/workspace` (WordPress may express the same REST route as a query URL when pretty permalinks are disabled). Use the menu-generated link rather than assuming WordPress is installed at the domain root.

**Sign out of WordPress** signs out the site's WordPress session. To test another role, use a separate browser profile or sign back in with that person's own WordPress account. The plugin does not let a requester select or impersonate another identity.

## Storage and updates

The plugin uses the site's existing `$wpdb` connection and site table prefix for its own `aigwp_` tables. It retains the existing assessment aggregates, policy versions, historical snapshots, and HMAC-linked audit records. Existing WordPress posts and the separate PHP/MySQL application's tables are not used as governance records.

The plugin creates a persistent random audit key in WordPress options. Back up that option with the database. Do not replace or delete it during an upgrade: older audit events require the original key. Deactivation and removal of the plugin file retain governance data so a code rollback does not erase history. Permanent data removal is a separate administrator operation after an appropriate backup and retention decision.

If the organization identifier or audit key option is missing while records remain, activation stops. Restore the original `aigwp_org_id` and `aigwp_audit_key` options from the same database backup; do not generate replacements to bypass the check.

Build and test a new release before replacing the plugin file. Preserve tables, options, WordPress user identities, and earlier assessments. There is no automatic data migration from Versions 1 or 2 and no claim of cross-version record compatibility.

## Validation and limitations

See the [implementation report](../../docs/implementation/WORDPRESS_PLUGIN_VERSION.md) for commands, actual results, and remaining verification. An installation should be checked with separate synthetic requester, reviewer, administrator, auditor, and unprivileged WordPress accounts, including a rejected unauthenticated request and a rejected requester decision.

This initial version does not include Multisite support, a public shortcode, email notifications, confidential document uploads, account provisioning, external identity federation, or an automatic upgrade/migration service. It relies on the WordPress site's authentication configuration and the security of other installed plugins and themes. A database administrator with access to both records and the audit key can forge a chain; application-level history preservation is not database-enforced immutability. Removing an audit tail requires an independently retained checkpoint to detect reliably.

The single-file format simplifies installation, but generated code is not the source to edit. Make changes in the repository and rebuild. No live WordPress site has been modified by creating this branch.
