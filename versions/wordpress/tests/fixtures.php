<?php
/** Run with WP-CLI eval-file only against an isolated test database. */
declare(strict_types=1);

if (!defined('ABSPATH') || !defined('DB_NAME') || !str_ends_with(DB_NAME, '_test')) {
    throw new RuntimeException('WordPress fixtures require an isolated database ending in _test.');
}
$password = getenv('WP_TEST_PASSWORD');
if (!is_string($password) || strlen($password) < 20) {
    throw new RuntimeException('Supply an ephemeral WP_TEST_PASSWORD of at least 20 characters.');
}
if (!function_exists('AiGovernanceWP\\connect')) {
    throw new RuntimeException('Activate the built AI Governance WordPress plugin first.');
}
// Fixtures never send account notifications, even if the local host has mail configured.
add_filter('pre_wp_mail', static fn() => true);
$roles = [
    'requester' => ['aigwp_requester', 'Synthetic Requester'],
    'reviewer' => ['aigwp_reviewer', 'Synthetic Reviewer'],
    'admin' => ['administrator', 'Synthetic Administrator'],
    'auditor' => ['aigwp_auditor', 'Synthetic Auditor'],
    'outsider' => ['subscriber', 'Synthetic Subscriber'],
];
foreach ($roles as $key => [$role, $name]) {
    $login = 'aigwp_'.$key.'_test';
    $existing = get_user_by('login', $login);
    $data = ['user_login' => $login, 'user_pass' => $password, 'user_email' => $key.'@example.invalid', 'display_name' => $name, 'role' => $role];
    if ($existing) $data['ID'] = $existing->ID;
    // wp_update_user hashes a new plaintext password for an existing account;
    // wp_insert_user's update path expects an already hashed value.
    $result = $existing ? wp_update_user($data) : wp_insert_user($data);
    if (is_wp_error($result)) throw new RuntimeException('Could not create a synthetic test identity.');
    wp_set_password($password, $result);
    $verified = get_user_by('id', $result);
    if (!wp_check_password($password, $verified->user_pass, $result)) throw new RuntimeException('Synthetic account password setup failed.');
}
$admin = AiGovernanceWP\actorFor(get_user_by('login', 'aigwp_admin_test'));
$reviewer = AiGovernanceWP\actorFor(get_user_by('login', 'aigwp_reviewer_test'));
$store = AiGovernanceWP\connect();
$policy = $store->configuration(AiGovernanceWP\organizationId());
AiGovernanceWP\execute($store, $admin, [
    'action' => 'configure', 'version' => $policy['version'], 'settings' => $policy['settings'],
    'routing' => array_fill_keys(['LOW', 'MODERATE', 'HIGH', 'EXECUTIVE_EXCEPTION'], $reviewer['id']),
]);
echo "Synthetic WordPress users and independent-reviewer routing prepared.\n";
