<?php
declare(strict_types=1);
namespace Governance;

function migrate(Store $s): void {
    $sql=file_get_contents(dirname(__DIR__).'/database/schema.sql');
    foreach (explode(';',$sql) as $statement) if (trim($statement)!=='') $s->db->exec($statement);
}
function sampleIntake(string $title): array {
    return ['title'=>$title,'toolName'=>$title,'vendor'=>'Example Tools (synthetic)','department'=>'Operations',
        'purpose'=>'Reduce repetitive work while preserving staff accountability.','description'=>'Synthetic assisted drafting demonstration.',
        'affectedUsers'=>'Department staff','affectedPeople'=>'Staff and program participants','dataCategories'=>['INTERNAL'],
        'decisionSupport'=>'Draft content for staff verification.','autonomy'=>'Suggestions only.','oversight'=>'A named staff member verifies every output.',
        'vendorInformation'=>'Synthetic vendor; assurance needs human review.','domain'=>'GENERAL',
        'answers'=>array_fill_keys(array_column(catalog()['dimensions'],'key'),1)];
}
function seed(Store $s, bool $examples=true): void {
    $org=catalog()['orgId']; $people=catalog()['demoUsers'];
    $s->query('INSERT IGNORE INTO governance_organizations(id,name) VALUES(?,?)',[$org,'Community Partners · Demonstration']);
    $s->db->beginTransaction();
    try {
        $s->query('SELECT id FROM governance_organizations WHERE id=? FOR UPDATE',[$org]);
        foreach($people as $u) $s->query('INSERT IGNORE INTO governance_users(id,organization_id,name,roles) VALUES(?,?,?,?)',[$u['id'],$org,$u['name'],json_encode([$u['role']],JSON_THROW_ON_ERROR)]);
        if (!$s->query('SELECT id FROM governance_policies WHERE organization_id=? LIMIT 1',[$org])->fetchColumn()) {
            $routing=['LOW'=>$people[1]['id'],'MODERATE'=>$people[1]['id'],'HIGH'=>$people[4]['id'],'EXECUTIVE_EXCEPTION'=>$people[4]['id']];
            $s->query('INSERT INTO governance_policies(id,organization_id,version,settings,routing,created_at) VALUES(?,?,1,?,?,UTC_TIMESTAMP(6))',[uuid(),$org,json_encode(catalog()['defaultConfig'],JSON_THROW_ON_ERROR),json_encode($routing,JSON_THROW_ON_ERROR)]);
            $s->audit($s->user($people[2]['id']),'CONFIGURATION_CHANGED',null,'Initial demonstration policy and routing created.');
        }
        $s->db->commit();
    } catch (\Throwable $e) { if ($s->db->inTransaction()) $s->db->rollBack(); throw $e; }
    if (!$examples) return;
    $existing=array_map(fn($row)=>json_decode($row['payload'],true,512,JSON_THROW_ON_ERROR)['title'],$s->query('SELECT payload FROM governance_cases WHERE organization_id=?',[$org])->fetchAll());
    $requester=$s->user($people[0]['id']);
    foreach(['Meeting notes, made easier','A writing partner for the team','Clinical documentation assistant','Applicant ranking assistant','Invoice processing assistant','Donor outreach planning'] as $i=>$title) {
        // Never reset or overwrite demonstration records that someone has edited.
        if (in_array($title,$existing,true)) continue;
        $data=sampleIntake($title);
        if ($i===0) $data['answers']=array_fill_keys(array_keys($data['answers']),0);
        if ($i===2) { $data['domain']='CLINICAL'; $data['dataCategories']=['CLIENT_HEALTH']; $data['answers']['dataSensitivity']=3; $data['answers']['vendorAssurance']=2; }
        if ($i===3) { $data['domain']='EMPLOYMENT'; $data['dataCategories']=['EMPLOYEE']; $data['answers']['autonomy']=3; }
        $id=execute($s,$requester,['action'=>'create','data'=>$data])['id'];
        if ($i===5) continue;
        execute($s,$requester,['action'=>'submit','id'=>$id,'revision'=>0]);
        $r=$s->record($id,$org); $reviewer=$s->user($r['reviews'][0]['reviewerId']);
        if (in_array($i,[0,2,3,4],true)) execute($s,$reviewer,['action'=>'decision','id'=>$id,'revision'=>1,
            'outcome'=>$i===2?'CONDITIONALLY_APPROVED':($i===3?'REJECTED':'APPROVED'),
            'rationale'=>'Synthetic human decision based on the documented scope, safeguards, and accountable review.',
            'mitigations'=>$i===2?[['description'=>'Verify all generated content before it enters the official record.','ownerId'=>$requester['id'],'dueAt'=>gmdate('Y-m-d',time()+14*86400)]]:[]]);
    }
}
