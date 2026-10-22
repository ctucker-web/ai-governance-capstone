<?php
declare(strict_types=1);
namespace AiGovernanceWP;

const SCHEMA_VERSION = '1';
function appUrl(): string { return admin_url('admin-post.php?action=aigwp_app'); }
function hasAccess(): bool { return is_user_logged_in() && count(governanceRoles(wp_get_current_user())) > 0; }
function initializeIdentity(Database $database): void {
    $query = $database->prepare('SELECT COUNT(*) FROM governance_organizations'); $query->execute();
    $retained = (int)$query->fetchColumn() > 0;
    $org = get_option('aigwp_org_id', false); $key = get_option('aigwp_audit_key', false);
    requireThat(!$retained || ($org !== false && $key !== false), 'Restore the original governance organization and audit key from backup before activation.', 503);
    if ($org !== false) {
        requireThat(is_string($org), 'Restore the governance organization option from backup.', 503);
        identifier($org);
        if ($retained) {
            $query = $database->prepare('SELECT id FROM governance_organizations WHERE id=?'); $query->execute([$org]);
            requireThat($query->fetchColumn() === $org, 'Restore the governance organization option from backup.', 503);
        }
    }
    if ($key !== false) requireThat(is_string($key) && preg_match('/^[a-f0-9]{64}$/', $key) === 1, 'Restore the original audit key from backup.', 503);
    if ($org === false) add_option('aigwp_org_id', uuid(), '', false);
    if ($key === false) add_option('aigwp_audit_key', bin2hex(random_bytes(32)), '', false);
}
function activate(bool $networkWide = false): void {
    if ($networkWide || is_multisite()) wp_die('This version supports single-site WordPress only. No network activation is supported.');
    if (version_compare(PHP_VERSION, '8.3', '<') || !extension_loaded('mbstring') || !extension_loaded('mysqli')) {
        wp_die('AI Governance requires PHP 8.3 or later with mbstring and mysqli.');
    }
    global $wpdb;
    $database = new Database($wpdb);
    // Dedicated InnoDB tables retain transactional workflow/history semantics.
    // WordPress remains the authority for identities; snapshots retain their names.
    $statements = [
        'CREATE TABLE IF NOT EXISTS governance_organizations (id CHAR(36) PRIMARY KEY, name VARCHAR(160) NOT NULL)',
        'CREATE TABLE IF NOT EXISTS governance_cases (id CHAR(36) PRIMARY KEY, organization_id CHAR(36) NOT NULL, requester_id CHAR(36) NOT NULL, revision INT NOT NULL DEFAULT 0, status VARCHAR(32) NOT NULL, payload LONGTEXT NOT NULL, updated_at DATETIME(6) NOT NULL, INDEX organization_status(organization_id,status), FOREIGN KEY (organization_id) REFERENCES governance_organizations(id))',
        'CREATE TABLE IF NOT EXISTS governance_policies (id CHAR(36) PRIMARY KEY, organization_id CHAR(36) NOT NULL, version INT NOT NULL, settings LONGTEXT NOT NULL, routing LONGTEXT NOT NULL, created_at DATETIME(6) NOT NULL, UNIQUE KEY organization_version(organization_id,version), FOREIGN KEY (organization_id) REFERENCES governance_organizations(id))',
        'CREATE TABLE IF NOT EXISTS governance_audit (sequence_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, id CHAR(36) NOT NULL UNIQUE, organization_id CHAR(36) NOT NULL, use_case_id CHAR(36) NULL, actor_id CHAR(36) NOT NULL, payload LONGTEXT NOT NULL, previous_hash CHAR(64) NOT NULL, event_hash CHAR(64) NOT NULL, INDEX record_events(use_case_id,sequence_id), FOREIGN KEY (organization_id) REFERENCES governance_organizations(id), FOREIGN KEY (use_case_id) REFERENCES governance_cases(id))',
        'CREATE TABLE IF NOT EXISTS governance_snapshots (id CHAR(36) PRIMARY KEY, use_case_id CHAR(36) NOT NULL, kind VARCHAR(24) NOT NULL, version INT NOT NULL, payload LONGTEXT NOT NULL, created_at DATETIME(6) NOT NULL, UNIQUE KEY record_kind_version(use_case_id,kind,version), FOREIGN KEY (use_case_id) REFERENCES governance_cases(id))',
    ];
    try {
        foreach ($statements as $sql) $database->exec($sql.' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        foreach (['organizations','cases','policies','audit','snapshots'] as $name) {
            $table = $wpdb->prefix.'aigwp_'.$name;
            $engine = $wpdb->get_var($wpdb->prepare('SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s', $table));
            requireThat(strtoupper((string)$engine) === 'INNODB', 'AI Governance requires InnoDB tables.', 503);
        }
        initializeIdentity($database);
        $store = connect(); $org = organizationId();
        $store->query('INSERT IGNORE INTO governance_organizations(id,name) VALUES(?,?)', [$org, mb_substr(get_bloginfo('name'), 0, 160)]);
        $database = $store->db; $database->beginTransaction();
        $store->query('SELECT id FROM governance_organizations WHERE id=? FOR UPDATE', [$org]);
        if (!$store->query('SELECT id FROM governance_policies WHERE organization_id=? LIMIT 1', [$org])->fetchColumn()) {
            $store->query('INSERT INTO governance_policies(id,organization_id,version,settings,routing,created_at) VALUES(?,?,1,?,?,UTC_TIMESTAMP(6))', [uuid(),$org,wp_json_encode(catalog()['defaultConfig']),wp_json_encode([])]);
            $user = wp_get_current_user();
            $setupActor = ['id'=>$user->exists()?userIdentifier((int)$user->ID):'00000000-0000-4000-8000-000000000000', 'organizationId'=>$org, 'name'=>$user->exists()?$user->display_name:'WordPress setup'];
            $store->audit($setupActor, 'CONFIGURATION_CHANGED', null, 'Initial policy version 1 created. Configure independent reviewer routing before submission.');
        }
        $database->commit();
        foreach (['requester'=>'request','reviewer'=>'review','auditor'=>'audit'] as $role=>$cap) {
            $name = 'aigwp_'.$role;
            add_role($name, 'AI Governance '.ucfirst($role), ['read'=>true,'aigwp_'.$cap=>true]);
            $wpRole = get_role($name);
            if ($wpRole) { $wpRole->add_cap('read'); $wpRole->add_cap('aigwp_'.$cap); }
        }
        $administrator = get_role('administrator');
        if ($administrator) foreach (['request','review','admin','audit'] as $cap) $administrator->add_cap('aigwp_'.$cap);
        update_option('aigwp_schema_version', SCHEMA_VERSION, false);
    } catch (\Throwable $error) {
        if ($database->inTransaction()) $database->rollBack();
        error_log('AI Governance activation failed: '.get_class($error));
        wp_die('AI Governance setup could not be completed. Check database permissions, PHP extensions, InnoDB support, and retained governance options. If options were lost, restore the original organization and audit key from backup. Existing data was retained.');
    }
}
function permission(\WP_REST_Request $request): bool|\WP_Error {
    if (is_multisite() || !hasAccess()) return new \WP_Error('aigwp_forbidden', 'Sign in with an authorized WordPress account.', ['status'=>is_user_logged_in()?403:401]);
    // The embedded UI uses WordPress cookie sessions and its REST nonce.
    if (!wp_verify_nonce($request->get_header('X-WP-Nonce'), 'wp_rest')) return new \WP_Error('aigwp_nonce', 'Your session needs refreshing. Sign in again.', ['status'=>403]);
    return true;
}
function workspaceRequest(\WP_REST_Request $request): \WP_REST_Response {
    try {
        $access = permission($request);
        if ($access instanceof \WP_Error) return new \WP_REST_Response(['error'=>$access->get_error_message()], $access->get_error_data()['status']);
        $store = connect(); $actor = actorFor(wp_get_current_user());
        if ($request->get_method() === 'GET') $result = $store->workspace($actor);
        else {
            requireThat($request->get_method() === 'POST', 'Method not allowed.', 405);
            requireThat(str_starts_with(strtolower($request->get_header('content-type')), 'application/json'), 'Use JSON requests.', 415);
            $raw = $request->get_body();
            requireThat(strlen($raw) <= 100000, 'Request is too large.', 413);
            try { $command = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
            catch (\JsonException) { throw new Problem(400, 'The request could not be read.'); }
            requireThat(is_array($command) && !array_is_list($command), 'Use a JSON object.');
            $result = execute($store, $actor, $command);
        }
        $response = new \WP_REST_Response($result, 200);
    } catch (\Throwable $error) {
        $known = $error instanceof Problem;
        if (!$known) error_log('AI Governance operation failed: '.get_class($error));
        $response = new \WP_REST_Response(['error'=>$known?$error->getMessage():'The operation could not be completed. Refresh and check its status before trying again.'], $known?$error->status:500);
    }
    $response->header('Cache-Control','no-store, private'); $response->header('X-Content-Type-Options','nosniff');
    return $response;
}
function renderApp(): void {
    if (!is_user_logged_in()) { wp_safe_redirect(wp_login_url(appUrl())); exit; }
    if (is_multisite() || !hasAccess()) wp_die('Your WordPress account needs an AI Governance role. Contact your site administrator.', 'AI Governance', ['response'=>403]);
    nocache_headers(); header('Cache-Control: no-store, private'); header('X-Frame-Options: DENY'); header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: same-origin');
    $nonce = base64_encode(random_bytes(18));
    header("Content-Security-Policy: default-src 'none'; script-src 'nonce-$nonce'; style-src 'nonce-$nonce'; connect-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    $settings = ['restUrl'=>rest_url('ai-governance/v1/workspace'),'nonce'=>wp_create_nonce('wp_rest'),'appUrl'=>appUrl(),'loginUrl'=>wp_login_url(appUrl()),'logoutUrl'=>html_entity_decode(wp_logout_url(appUrl()), ENT_QUOTES, 'UTF-8'),'siteName'=>get_bloginfo('name')];
    echo '<!doctype html><html lang="'.esc_attr(get_bloginfo('language')).'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Governance · WordPress Plugin Version</title><style nonce="'.esc_attr($nonce).'">'.str_ireplace('</style', '<\/style', stylesheet()).'</style></head><body><div id="root"></div><noscript>This workspace needs JavaScript enabled.</noscript><script nonce="'.esc_attr($nonce).'">window.aigwp='.wp_json_encode($settings, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT).';</script><script nonce="'.esc_attr($nonce).'">'.str_ireplace('</script','<\/script',javascript()).'</script></body></html>';
    exit;
}
register_activation_hook(__FILE__, __NAMESPACE__.'\\activate');
add_action('rest_api_init', static function (): void {
    register_rest_route('ai-governance/v1', '/workspace', ['methods'=>['GET','POST'],'callback'=>__NAMESPACE__.'\\workspaceRequest','permission_callback'=>__NAMESPACE__.'\\permission']);
});
add_filter('rest_post_dispatch', static function ($response, $server, $request) {
    if (str_starts_with($request->get_route(), '/ai-governance/v1/')) {
        $response->header('Cache-Control', 'no-store, private');
        $response->header('X-Content-Type-Options', 'nosniff');
    }
    return $response;
}, 10, 3);
add_action('admin_post_aigwp_app', __NAMESPACE__.'\\renderApp');
add_action('admin_post_nopriv_aigwp_app', __NAMESPACE__.'\\renderApp');
add_action('admin_menu', static function (): void {
    if (!hasAccess() || is_multisite()) return;
    add_menu_page('AI Governance','AI Governance','read','aigwp', static function (): void {
        if (!hasAccess()) wp_die('AI Governance access is required.', '', ['response'=>403]);
        echo '<div class="wrap"><h1>AI Governance</h1><p>Use your WordPress account to assess AI use and record independent human decisions.</p>';
        if (current_user_can('aigwp_admin')) echo '<p>First use: assign AI Governance roles to existing users under Users, then open Administration in the workspace and select an independent reviewer for each risk tier. Use synthetic information while evaluating this version.</p>';
        echo '<p><a class="button button-primary" href="'.esc_url(appUrl()).'">Open AI Governance</a></p></div>';
    }, 'dashicons-shield', 58);
});
