<?php
declare(strict_types=1);
namespace AiGovernanceWP;

function organizationId(): string {
    $id = get_option('aigwp_org_id', '');
    requireThat(is_string($id) && $id !== '', 'Activate the AI Governance plugin to finish setup.', 503);
    return identifier($id);
}
function userIdentifier(int $id): string {
    requireThat($id > 0 && $id <= 0xffffffffffff, 'Unsupported WordPress user identifier.', 403);
    return sprintf('00000000-0000-4000-8000-%012x', $id);
}
function governanceRoles(\WP_User $user): array {
    $roles = [];
    foreach (['aigwp_request'=>'REQUESTER', 'aigwp_review'=>'REVIEWER', 'aigwp_admin'=>'ADMINISTRATOR', 'aigwp_audit'=>'AUDITOR'] as $capability=>$role) {
        if (user_can($user, $capability)) $roles[] = $role;
    }
    return $roles;
}
function actorFor(\WP_User $user): array {
    $roles = governanceRoles($user);
    requireThat($user->exists() && count($roles) > 0, 'Your WordPress account needs an AI Governance role. Contact your site administrator.', 403);
    return ['id'=>userIdentifier((int)$user->ID), 'organizationId'=>organizationId(), 'name'=>$user->display_name, 'roles'=>$roles];
}
final class Store extends SharedStore {
    /** Always resolve privileges from WordPress, never from record snapshots. */
    public function user(string $id): array {
        requireThat(preg_match('/^00000000-0000-4000-8000-([0-9a-f]{12})$/', $id, $matches) === 1, 'WordPress account unavailable.', 403);
        $user = get_user_by('id', (int)hexdec($matches[1]));
        requireThat($user instanceof \WP_User, 'WordPress account unavailable.', 403);
        return actorFor($user);
    }
    public function users(string $org): array {
        requireThat($org === organizationId(), 'Organization unavailable.', 403);
        $result = [];
        foreach (get_users(['blog_id'=>get_current_blog_id(), 'orderby'=>'display_name', 'order'=>'ASC']) as $user) {
            if ($user instanceof \WP_User && governanceRoles($user)) $result[] = actorFor($user);
        }
        return $result;
    }
}
function connect(): Store {
    global $wpdb;
    $key = get_option('aigwp_audit_key', '');
    requireThat(is_string($key) && strlen($key) >= 64, 'Activate the AI Governance plugin to finish setup.', 503);
    return new Store(new Database($wpdb), $key);
}
