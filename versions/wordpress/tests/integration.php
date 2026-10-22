<?php
/** Real WordPress / MySQL integration; run using WP-CLI eval-file. */
declare(strict_types=1);

if (!defined('ABSPATH') || !defined('DB_NAME') || !str_ends_with(DB_NAME, '_test')) {
    throw new RuntimeException('Integration tests require a database ending in _test.');
}
require_once dirname(__DIR__, 3).'/versions/php-mysql/app/domain.php';
$GLOBALS['aigwp_passed'] = 0;
function aigwpCheck(bool $ok, string $label): void {
    if (!$ok) throw new RuntimeException($label);
    $GLOBALS['aigwp_passed']++;
    echo "PASS $label\n";
}
function aigwpReject(callable $action, int $status, string $label): void {
    try { $action(); }
    catch (AiGovernanceWP\Problem $e) { aigwpCheck($e->status === $status, $label); return; }
    throw new RuntimeException('Expected rejection: '.$label);
}
$store = AiGovernanceWP\connect();
$org = AiGovernanceWP\organizationId();
$ownerUser = get_user_by('login', 'aigwp_requester_test');
$owner = AiGovernanceWP\actorFor($ownerUser);
$reviewer = AiGovernanceWP\actorFor(get_user_by('login', 'aigwp_reviewer_test'));
$admin = AiGovernanceWP\actorFor(get_user_by('login', 'aigwp_admin_test'));
$auditor = AiGovernanceWP\actorFor(get_user_by('login', 'aigwp_auditor_test'));
aigwpCheck($owner['id'] === AiGovernanceWP\userIdentifier($ownerUser->ID), 'WordPress identity has a stable governance identifier');
aigwpCheck($owner['roles'] === ['REQUESTER'], 'Requester gets only assigned governance capability');
aigwpReject(fn() => AiGovernanceWP\actorFor(get_user_by('login', 'aigwp_outsider_test')), 403, 'A subscriber does not gain governance access');
wp_set_current_user(get_user_by('login', 'aigwp_outsider_test')->ID);
$request = new WP_REST_Request('GET', '/ai-governance/v1/workspace');
$request->set_header('X-WP-Nonce', wp_create_nonce('wp_rest'));
$denial = AiGovernanceWP\permission($request);
aigwpCheck($denial instanceof WP_Error && $denial->get_error_data()['status'] === 403, 'A valid WordPress nonce does not grant a subscriber governance access');
wp_set_current_user(0);

$config = AiGovernanceWP\catalog()['defaultConfig'];
$keys = array_column(AiGovernanceWP\catalog()['dimensions'], 'key');
$zero = array_fill_keys($keys, 0);
$parity = true;
foreach (['GENERAL', 'CLINICAL', 'EMPLOYMENT', 'FINANCE', 'FUNDRAISING'] as $domain) {
    for ($i = 0; $i < 64; $i++) {
        $answers = [];
        foreach ($keys as $n => $key) $answers[$key] = ($i + intdiv($i, 4) * $n + $n) % 4;
        if (AiGovernanceWP\assess($answers, $domain, $config) !== Governance\assess($answers, $domain, $config)) $parity = false;
    }
}
aigwpCheck($parity, '320 risk evaluations match the existing PHP classifier exactly');
aigwpReject(fn() => AiGovernanceWP\answers(array_replace($zero, ['impact' => '3'])), 400, 'String risk scores remain invalid');
aigwpReject(fn() => AiGovernanceWP\answers(array_replace($zero, ['extra' => 0])), 400, 'Extra risk factors remain invalid');

$data = [
    'title' => 'WordPress integration '.AiGovernanceWP\uuid(), 'toolName' => 'Synthetic Draft Assistant', 'vendor' => 'Example Vendor', 'department' => 'Programs',
    'purpose' => "Draft governance_cases ? % ' content safely.", 'description' => 'Staff verify every draft.', 'affectedUsers' => 'Fictional staff', 'affectedPeople' => 'Fictional volunteers',
    'decisionSupport' => 'Draft content only.', 'autonomy' => 'No independent decisions.', 'oversight' => 'Every output is checked.', 'vendorInformation' => 'Synthetic assurance review.',
    'dataCategories' => ['PUBLIC'], 'domain' => 'GENERAL', 'answers' => $zero,
];
$id = AiGovernanceWP\execute($store, $owner, ['action' => 'create', 'data' => $data])['id'];
aigwpCheck($store->record($id, $org)['status'] === 'DRAFT', 'Draft persists in WordPress database');
aigwpCheck($store->record($id, $org)['purpose'] === $data['purpose'], 'Prepared values preserve table names, quotes, percent signs and question marks');
aigwpCheck(!in_array($id, array_column($store->workspace($auditor)['records'], 'id'), true), 'Auditor cannot inspect an unapproved draft');
aigwpReject(fn() => AiGovernanceWP\execute($store, $auditor, ['action' => 'create', 'data' => $data]), 403, 'Auditor cannot create an assessment');
aigwpReject(fn() => AiGovernanceWP\execute($store, $owner, ['action' => 'submit', 'id' => $id, 'revision' => 999]), 409, 'Stale revision rejected');
AiGovernanceWP\execute($store, $owner, ['action' => 'submit', 'id' => $id, 'revision' => 0]);
$r = $store->record($id, $org);
$snapshot = $r['assessments'][0];
aigwpCheck($r['status'] === 'UNDER_REVIEW' && $r['reviews'][0]['reviewerId'] === $reviewer['id'], 'Submission routes to the configured independent WordPress reviewer');
$decision = ['action' => 'decision', 'id' => $id, 'revision' => 1, 'outcome' => 'CONDITIONALLY_APPROVED', 'rationale' => 'Human checks are required.', 'mitigations' => []];
aigwpReject(fn() => AiGovernanceWP\execute($store, $owner, $decision), 403, 'Requester self approval rejected');
aigwpReject(fn() => AiGovernanceWP\execute($store, $admin, $decision), 403, 'Administrator cannot bypass assigned review');
aigwpReject(fn() => AiGovernanceWP\execute($store, $reviewer, $decision), 400, 'Conditional approval requires a mitigation');
$noRationale = array_replace($decision, ['outcome' => 'APPROVED', 'rationale' => '']);
aigwpReject(fn() => AiGovernanceWP\execute($store, $reviewer, $noRationale), 400, 'Approval requires a rationale');
aigwpCheck($store->record($id, $org)['status'] === 'UNDER_REVIEW', 'Rejected commands roll back without changing status');
$decision['mitigations'] = [['description' => 'Verify every draft.', 'ownerId' => $owner['id'], 'dueAt' => gmdate('Y-m-d', time() + 86400 * 14)]];
AiGovernanceWP\execute($store, $reviewer, $decision);
$r = $store->record($id, $org);
aigwpCheck($r['status'] === 'CONDITIONALLY_APPROVED' && $r['assessments'][0] === $snapshot, 'Named human decision preserves the original assessment');
aigwpCheck(in_array($id, array_column($store->workspace($auditor)['records'], 'id'), true), 'Auditor can inspect the approved governance record');
AiGovernanceWP\execute($store, $owner, ['action' => 'mitigation', 'id' => $id, 'mitigationId' => $r['mitigations'][0]['id'], 'status' => 'COMPLETE', 'notes' => 'Synthetic check completed.']);
AiGovernanceWP\execute($store, $owner, ['action' => 'reassess', 'id' => $id, 'revision' => 2, 'reason' => 'Synthetic scope update.']);
AiGovernanceWP\execute($store, $owner, ['action' => 'submit', 'id' => $id, 'revision' => 3]);
$r = $store->record($id, $org);
aigwpCheck(count($r['assessments']) === 2 && $r['assessments'][1] === $snapshot, 'Reassessment adds history without overwriting earlier versions');

$adminCase = AiGovernanceWP\execute($store, $admin, ['action' => 'create', 'data' => array_replace($data, ['title' => 'Admin self review '.AiGovernanceWP\uuid()])])['id'];
AiGovernanceWP\execute($store, $admin, ['action' => 'submit', 'id' => $adminCase, 'revision' => 0]);
aigwpReject(fn() => AiGovernanceWP\execute($store, $admin, array_replace($decision, ['id' => $adminCase, 'outcome' => 'APPROVED', 'mitigations' => []])), 403, 'Administrator with reviewer capability still cannot approve their own submission');

$before = $store->configuration($org);
AiGovernanceWP\execute($store, $admin, ['action' => 'configure', 'version' => $before['version'], 'settings' => $before['settings'], 'routing' => $before['routing']]);
aigwpCheck($store->configuration($org)['version'] === $before['version'] + 1, 'Policy configuration creates another version');
aigwpCheck($store->verifyAudit($org), 'HMAC audit chain verifies after the complete workflow');
$ownerUser->add_cap('aigwp_request', false);
try {
    aigwpReject(fn() => $store->user($owner['id']), 403, 'Revoked WordPress capability is enforced on the next identity lookup');
} finally { $ownerUser->remove_cap('aigwp_request'); }
aigwpCheck(in_array('REQUESTER', $store->user($owner['id'])['roles'], true), 'Restored WordPress capability is effective without copied-role synchronization');
$key = get_option('aigwp_audit_key');
$configuration = $store->configuration($org);
$history = $store->record($id, $org);
AiGovernanceWP\activate();
aigwpCheck(get_option('aigwp_audit_key') === $key && AiGovernanceWP\organizationId() === $org, 'Reactivation preserves organization and audit key');
aigwpCheck($store->configuration($org) === $configuration && $store->record($id, $org) === $history && $store->verifyAudit($org), 'Reactivation preserves policy, assessment history and audit integrity');
foreach (['aigwp_org_id'=>$org, 'aigwp_audit_key'=>$key] as $option=>$value) {
    delete_option($option);
    try {
        aigwpReject(fn() => AiGovernanceWP\initializeIdentity($store->db), 503, 'Missing '.$option.' refuses to initialize over existing records');
        aigwpCheck(get_option($option, false) === false, 'Missing '.$option.' is not silently replaced');
    } finally { add_option($option, $value, '', false); }
}
aigwpCheck($store->verifyAudit($org), 'Restoring original options preserves the audit chain');
echo $GLOBALS['aigwp_passed']." WordPress integration checks passed.\n";
