<?php
declare(strict_types=1);
namespace Governance;

final class Problem extends \RuntimeException {
    public function __construct(public int $status, string $message) { parent::__construct($message); }
}
function requireThat(bool $condition, string $message, int $status = 400): void {
    if (!$condition) throw new Problem($status, $message);
}
function uuid(): string {
    $bytes = random_bytes(16); $bytes[6] = chr((ord($bytes[6]) & 15) | 64); $bytes[8] = chr((ord($bytes[8]) & 63) | 128);
    $s = bin2hex($bytes); return substr($s,0,8).'-'.substr($s,8,4).'-'.substr($s,12,4).'-'.substr($s,16,4).'-'.substr($s,20);
}
function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }
function text(array $data, string $key, int $max = 4000, bool $required = true): string {
    requireThat(isset($data[$key]) && is_string($data[$key]), "$key must be text.");
    $value = trim($data[$key]);
    requireThat((!$required || $value !== '') && mb_strlen($value) <= $max, "$key is required and must be at most $max characters.");
    return $value;
}
function identifier(mixed $value): string {
    requireThat(is_string($value) && preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i', $value) === 1, 'Invalid record identifier.');
    return $value;
}
function dateValue(mixed $value): string {
    requireThat(is_string($value), 'A date is required.');
    $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    requireThat($date !== false && $date->format('Y-m-d') === $value, 'Use a valid calendar date.');
    return $value;
}
function catalog(): array { static $data; return $data ??= json_decode(file_get_contents(__DIR__.'/catalog.json'), true, 512, JSON_THROW_ON_ERROR); }
function answers(mixed $data): array {
    requireThat(is_array($data), 'All eight risk answers are required.');
    $result = [];
    foreach (catalog()['dimensions'] as $d) {
        $key = $d['key']; $value = $data[$key] ?? null;
        requireThat(is_int($value) && $value >= 0 && $value <= 3, "$key must be an integer from 0 to 3.");
        $result[$key] = $value;
    }
    requireThat(count($data) === count($result), 'Unexpected risk answer.');
    return $result;
}
function policy(mixed $data): array {
    requireThat(is_array($data) && is_array($data['weights'] ?? null) && is_array($data['rules'] ?? null), 'Invalid policy.');
    $weights = [];
    foreach (catalog()['dimensions'] as $d) {
        $w = $data['weights'][$d['key']] ?? null;
        requireThat((is_int($w) || is_float($w)) && is_finite((float)$w) && $w >= .25 && $w <= 5, 'Weights must be between 0.25 and 5.');
        $weights[$d['key']] = $w;
    }
    foreach (['moderate','high','exception'] as $key) requireThat(isset($data[$key]) && (is_int($data[$key]) || is_float($data[$key])) && is_finite((float)$data[$key]), 'Invalid threshold.');
    requireThat($data['moderate'] >= 1 && $data['high'] >= 2 && $data['exception'] >= 3 && $data['moderate'] < $data['high'] && $data['high'] < $data['exception'] && $data['exception'] <= array_sum($weights)*3, 'Thresholds must increase and be attainable.');
    requireThat(is_int($data['reassessmentDays'] ?? null) && $data['reassessmentDays'] >= 7 && $data['reassessmentDays'] <= 730, 'Review interval must be 7–730 days.');
    foreach (['autonomousCritical','sensitiveVendor','uncontrolledImpact'] as $key) requireThat(is_bool($data['rules'][$key] ?? null), 'Invalid escalation setting.');
    return ['weights'=>$weights,'moderate'=>(float)$data['moderate'],'high'=>(float)$data['high'],'exception'=>(float)$data['exception'],'reassessmentDays'=>$data['reassessmentDays'],'rules'=>array_intersect_key($data['rules'],array_flip(['autonomousCritical','sensitiveVendor','uncontrolledImpact']))];
}
function assess(array $input, string $domain, array $settings): array {
    $a = answers($input); $c = policy($settings); $factors = []; $total = 0;
    foreach (catalog()['dimensions'] as $d) {
        $k = $d['key']; $contribution = $a[$k]*$c['weights'][$k]; $total += $contribution;
        $factors[] = ['key'=>$k,'label'=>$d['label'],'score'=>$a[$k],'weight'=>$c['weights'][$k],'contribution'=>$contribution];
    }
    $score = round($total,2); $rank = $score >= $c['exception'] ? 3 : ($score >= $c['high'] ? 2 : ($score >= $c['moderate'] ? 1 : 0)); $rules = [];
    if ($c['rules']['autonomousCritical'] && $a['autonomy'] === 3 && in_array($domain,['CLINICAL','EMPLOYMENT'],true)) { $rank = 3; $rules[] = 'Autonomous clinical or employment decisions require executive exception review.'; }
    if ($c['rules']['sensitiveVendor'] && $a['dataSensitivity'] === 3 && $a['vendorAssurance'] >= 2) { $rank = max($rank,2); $rules[] = 'Highly sensitive information combined with inadequate vendor assurance or unclear data use.'; }
    if ($c['rules']['uncontrolledImpact'] && $a['impact'] === 3 && $a['oversight'] >= 2) { $rank = max($rank,2); $rules[] = 'High-impact decisions lack meaningful human oversight.'; }
    return ['score'=>$score,'tier'=>['LOW','MODERATE','HIGH','EXECUTIVE_EXCEPTION'][$rank],'factors'=>$factors,'triggeredRules'=>$rules];
}
function intake(mixed $input): array {
    requireThat(is_array($input), 'Intake is required.'); $out = [];
    foreach (['title','toolName','vendor','department'] as $key) $out[$key] = text($input,$key,160);
    foreach (['purpose','description','affectedUsers','affectedPeople','decisionSupport','autonomy','oversight','vendorInformation'] as $key) $out[$key] = text($input,$key);
    requireThat(in_array($input['domain'] ?? null,['GENERAL','CLINICAL','EMPLOYMENT','FINANCE','FUNDRAISING'],true), 'Invalid area of use.'); $out['domain'] = $input['domain'];
    $categories = $input['dataCategories'] ?? null;
    requireThat(is_array($categories) && count($categories)>0 && count($categories)<=7, 'Select data categories.');
    foreach ($categories as $value) requireThat(in_array($value,['PUBLIC','INTERNAL','CLIENT_HEALTH','EMPLOYEE','FINANCIAL','DONOR','OTHER_CONFIDENTIAL'],true), 'Invalid data category.');
    $out['dataCategories'] = array_values(array_unique($categories)); $out['answers'] = answers($input['answers'] ?? null); return $out;
}
function hasRole(array $actor, string $role): bool { return in_array($role,$actor['roles'],true); }
function approved(string $status): bool { return in_array($status,['APPROVED','CONDITIONALLY_APPROVED','REASSESSMENT_DUE'],true); }
function assigned(array $actor, array $record): bool {
    if (!hasRole($actor,'REVIEWER') || $record['requesterId'] === $actor['id']) return false;
    foreach ($record['reviews'] as $r) if ($r['reviewerId'] === $actor['id']) return true;
    return false;
}
function visible(array $actor, array $record): bool {
    return $actor['organizationId'] === $record['organizationId'] && (hasRole($actor,'ADMINISTRATOR') || (hasRole($actor,'REQUESTER') && $record['requesterId'] === $actor['id']) || assigned($actor,$record) || (hasRole($actor,'AUDITOR') && approved($record['status'])));
}
