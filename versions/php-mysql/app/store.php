<?php
declare(strict_types=1);
namespace Governance;

final class Store {
    public function __construct(public \PDO $db, private string $auditKey) {}
    public function query(string $sql, array $params = []): \PDOStatement { $q=$this->db->prepare($sql); $q->execute($params); return $q; }
    public function user(string $id): array {
        $u=$this->query('SELECT * FROM governance_users WHERE id=?',[$id])->fetch();
        requireThat($u !== false,'Please sign in to continue.',401);
        return ['id'=>$u['id'],'organizationId'=>$u['organization_id'],'name'=>$u['name'],'roles'=>json_decode($u['roles'],true,512,JSON_THROW_ON_ERROR)];
    }
    public function users(string $org): array {
        $rows=$this->query('SELECT id FROM governance_users WHERE organization_id=? ORDER BY name',[$org])->fetchAll();
        return array_map(fn($r)=>$this->user($r['id']),$rows);
    }
    public function configuration(string $org): array {
        $r=$this->query('SELECT * FROM governance_policies WHERE organization_id=? ORDER BY version DESC LIMIT 1',[$org])->fetch();
        requireThat($r !== false,'Risk policy must be configured.',409);
        return ['id'=>$r['id'],'organizationId'=>$org,'version'=>(int)$r['version'],'settings'=>json_decode($r['settings'],true,512,JSON_THROW_ON_ERROR),'routing'=>json_decode($r['routing'],true,512,JSON_THROW_ON_ERROR),'createdAt'=>$r['created_at']];
    }
    public function record(string $id, string $org): array {
        $row=$this->query('SELECT payload FROM governance_cases WHERE id=? AND organization_id=?',[$id,$org])->fetch();
        requireThat($row !== false,'This record is unavailable.',404);
        return json_decode($row['payload'],true,512,JSON_THROW_ON_ERROR);
    }
    public function save(array $r, bool $create = false): void {
        $data=json_encode($r,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
        if ($create) $this->query('INSERT INTO governance_cases(id,organization_id,requester_id,revision,status,payload,updated_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))',[$r['id'],$r['organizationId'],$r['requesterId'],$r['revision'],$r['status'],$data]);
        else $this->query('UPDATE governance_cases SET revision=?,status=?,payload=?,updated_at=UTC_TIMESTAMP(6) WHERE id=? AND organization_id=?',[$r['revision'],$r['status'],$data,$r['id'],$r['organizationId']]);
    }
    public function snapshot(string $case, string $kind, int $version, array $data): void {
        $this->query('INSERT INTO governance_snapshots(id,use_case_id,kind,version,payload,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))',[uuid(),$case,$kind,$version,json_encode($data,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE)]);
    }
    public function audit(array $actor, string $action, ?string $case, string $summary, ?string $previous = null, ?string $next = null): void {
        $last=$this->query('SELECT event_hash FROM governance_audit WHERE organization_id=? ORDER BY sequence_id DESC LIMIT 1',[$actor['organizationId']])->fetchColumn();
        $hash=$last === false ? str_repeat('0',64) : $last;
        $e=['id'=>uuid(),'useCaseId'=>$case,'actorId'=>$actor['id'],'actor'=>['name'=>$actor['name']],'action'=>$action,'summary'=>$summary,'previousStatus'=>$previous,'newStatus'=>$next,'createdAt'=>now()];
        $payload=json_encode($e,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
        $digest=hash_hmac('sha256',$hash.$payload,$this->auditKey);
        $this->query('INSERT INTO governance_audit(id,organization_id,use_case_id,actor_id,payload,previous_hash,event_hash) VALUES(?,?,?,?,?,?,?)',[$e['id'],$actor['organizationId'],$case,$actor['id'],$payload,$hash,$digest]);
    }
    public function verifyAudit(string $org): bool {
        $previous=str_repeat('0',64);
        foreach ($this->query('SELECT payload,previous_hash,event_hash FROM governance_audit WHERE organization_id=? ORDER BY sequence_id',[$org])->fetchAll() as $row) {
            if ($row['previous_hash'] !== $previous || !hash_equals(hash_hmac('sha256',$previous.$row['payload'],$this->auditKey),$row['event_hash'])) return false;
            $previous=$row['event_hash'];
        }
        return true;
    }
    public function workspace(array $actor): array {
        $records=[]; $ids=[];
        foreach ($this->query('SELECT payload FROM governance_cases WHERE organization_id=? ORDER BY updated_at DESC',[$actor['organizationId']])->fetchAll() as $row) {
            $r=json_decode($row['payload'],true,512,JSON_THROW_ON_ERROR);
            if (visible($actor,$r)) { $records[]=$r; $ids[$r['id']]=true; }
        }
        $events=[]; $admin=hasRole($actor,'ADMINISTRATOR');
        foreach ($this->query('SELECT payload,use_case_id FROM governance_audit WHERE organization_id=? ORDER BY sequence_id DESC',[$actor['organizationId']])->fetchAll() as $row) {
            if (($row['use_case_id'] === null && $admin) || isset($ids[$row['use_case_id'] ?? ''])) $events[]=json_decode($row['payload'],true,512,JSON_THROW_ON_ERROR);
        }
        $users=array_map(fn($u)=>['id'=>$u['id'],'name'=>$u['name'],'roles'=>array_map(fn($r)=>['role'=>$r],$u['roles'])],$this->users($actor['organizationId']));
        $c=$admin ? $this->configuration($actor['organizationId']) : null; $routing=[];
        if ($c) foreach ($c['routing'] as $tier=>$reviewer) $routing[]=['tier'=>$tier,'reviewerId'=>$reviewer];
        return ['actor'=>$actor,'records'=>$records,'events'=>$events,'users'=>$users,'configuration'=>$c,'routing'=>$routing];
    }
}
