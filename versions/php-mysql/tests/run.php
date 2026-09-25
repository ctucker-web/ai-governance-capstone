<?php
declare(strict_types=1);
require dirname(__DIR__).'/app/bootstrap.php';
require dirname(__DIR__).'/app/seed.php';
use function Governance\{catalog,assess,answers,policy,execute,uuid,sampleIntake};
$passed=0;
function check(bool $condition,string $message): void { global $passed; if (!$condition) throw new RuntimeException($message); $passed++; echo "PASS $message\n"; }
function rejects(callable $fn,int $status,string $message): void {
    try { $fn(); } catch (Governance\Problem $e) { check($e->status===$status,$message); return; }
    throw new RuntimeException('Expected rejection: '.$message);
}
$empty=array_fill_keys(array_column(catalog()['dimensions'],'key'),0); $config=catalog()['defaultConfig'];
foreach ([0=>'LOW',7=>'LOW',8=>'MODERATE',14=>'MODERATE',15=>'HIGH',21=>'HIGH',22=>'EXECUTIVE_EXCEPTION',24=>'EXECUTIVE_EXCEPTION'] as $score=>$tier) {
    $a=$empty; $remaining=$score; foreach($a as &$value) { $value=min(3,$remaining); $remaining-=$value; } unset($value);
    $c=$config; $c['rules']=array_fill_keys(array_keys($c['rules']),false); $result=assess($a,'GENERAL',$c);
    check($result['score']===$score*1.0 && $result['tier']===$tier,"Score boundary $score → $tier");
}
$a=$empty; $a['autonomy']=3;
check(assess($a,'CLINICAL',$config)['tier']==='EXECUTIVE_EXCEPTION','Clinical autonomy escalation');
check(assess($a,'EMPLOYMENT',$config)['tier']==='EXECUTIVE_EXCEPTION','Employment autonomy escalation');
$a=$empty; $a['dataSensitivity']=3; $a['vendorAssurance']=2;
check(assess($a,'GENERAL',$config)['tier']==='HIGH','Sensitive vendor escalation');
$a=$empty; $a['impact']=3; $a['oversight']=2;
check(assess($a,'GENERAL',$config)['tier']==='HIGH','Oversight escalation');
rejects(fn()=>answers([]),400,'Incomplete answers rejected');
rejects(fn()=>answers(array_replace($empty,['impact'=>'3'])),400,'String risk scores rejected');
$invalid=$config; $invalid['high']=1; rejects(fn()=>policy($invalid),400,'Unordered thresholds rejected');
rejects(fn()=>Governance\dateValue('2026-02-30'),400,'Impossible date rejected');
if (in_array('--integration',$argv,true)) {
    $configuration=Governance\configuration();
    if (!preg_match('/dbname=[^;]*_test(?:;|$)/',$configuration['dsn'])) throw new RuntimeException('Integration tests require a database name ending in _test.');
    $s=Governance\connect(); Governance\migrate($s); Governance\seed($s,false);
    $people=catalog()['demoUsers']; $org=catalog()['orgId'];
    $owner=$s->user($people[0]['id']); $reviewer=$s->user($people[1]['id']); $admin=$s->user($people[2]['id']); $auditor=$s->user($people[3]['id']);
    $data=sampleIntake('Integration '.uuid()); $data['answers']=$empty;
    rejects(fn()=>execute($s,$auditor,['action'=>'create','data'=>$data]),403,'Auditor cannot create');
    $id=execute($s,$owner,['action'=>'create','data'=>$data])['id'];
    check($s->record($id,$org)['status']==='DRAFT','Draft persisted');
    check(!in_array($id,array_column($s->workspace($auditor)['records'],'id'),true),'Auditor cannot read draft');
    rejects(fn()=>execute($s,$owner,['action'=>'submit','id'=>$id,'revision'=>99]),409,'Stale submission rejected');
    execute($s,$owner,['action'=>'submit','id'=>$id,'revision'=>0]);
    $r=$s->record($id,$org); $snapshot=$r['assessments'][0];
    check($r['status']==='UNDER_REVIEW' && $snapshot['tier']==='LOW','Submission assesses and routes');
    $decision=['action'=>'decision','id'=>$id,'revision'=>1,'outcome'=>'CONDITIONALLY_APPROVED','rationale'=>'Human review verified safeguards.','mitigations'=>[]];
    rejects(fn()=>execute($s,$owner,$decision),403,'Self approval rejected');
    rejects(fn()=>execute($s,$admin,$decision),403,'Administrator cannot bypass reviewer');
    rejects(fn()=>execute($s,$reviewer,$decision),400,'Conditional decision requires mitigation');
    check($s->record($id,$org)['status']==='UNDER_REVIEW','Failed decision rolled back');
    execute($s,$reviewer,['action'=>'information','id'=>$id,'revision'=>1,'message'=>'Clarify the controls.']);
    execute($s,$owner,['action'=>'edit','id'=>$id,'revision'=>2,'data'=>$data]);
    execute($s,$owner,['action'=>'submit','id'=>$id,'revision'=>3]);
    $decision['revision']=4; $decision['mitigations']=[['description'=>'Document verification.','ownerId'=>$owner['id'],'dueAt'=>'2027-01-01']];
    execute($s,$reviewer,$decision);
    $r=$s->record($id,$org);
    check($r['status']==='CONDITIONALLY_APPROVED' && count($r['assessments'])===2,'Follow-up and human decision persisted');
    check($r['assessments'][1]===$snapshot,'Earlier assessment unchanged');
    check(in_array($id,array_column($s->workspace($auditor)['records'],'id'),true),'Auditor can read approved record');
    rejects(fn()=>execute($s,$reviewer,$decision),409,'Duplicate stale decision rejected');
    $mitigation=['action'=>'mitigation','id'=>$id,'mitigationId'=>$r['mitigations'][0]['id'],'status'=>'WAIVED','notes'=>'Owner attempted waiver'];
    rejects(fn()=>execute($s,$owner,$mitigation),403,'Requester cannot waive mitigation');
    $mitigation['status']='COMPLETE'; $mitigation['notes']='Verification checklist completed.'; execute($s,$owner,$mitigation);
    execute($s,$reviewer,['action'=>'evidence','id'=>$id,'type'=>'Assurance','description'=>'Synthetic reference','reference'=>'https://example.com/assurance','notes'=>'Reviewed','reviewedAt'=>'2026-09-25']);
    check(count($s->record($id,$org)['evidence'])===1,'Evidence persisted');
    execute($s,$owner,['action'=>'reassess','id'=>$id,'revision'=>5,'reason'=>'Scope changed.']);
    check($s->record($id,$org)['status']==='DRAFT','Reassessment opens new draft');
    $c=$s->configuration($org); $change=['action'=>'configure','version'=>$c['version'],'settings'=>$c['settings'],'routing'=>$c['routing']];
    rejects(fn()=>execute($s,$owner,$change),403,'Requester cannot configure policy');
    execute($s,$admin,$change); rejects(fn()=>execute($s,$admin,$change),409,'Stale policy update rejected');
    check($s->verifyAudit($org),'Audit chain validates after complete workflow');
    $event=$s->query('SELECT sequence_id,payload FROM governance_audit WHERE organization_id=? ORDER BY sequence_id DESC LIMIT 1',[$org])->fetch();
    try { $s->query('UPDATE governance_audit SET payload=? WHERE sequence_id=?',['{}',$event['sequence_id']]); check(!$s->verifyAudit($org),'Audit modification detected'); }
    finally { $s->query('UPDATE governance_audit SET payload=? WHERE sequence_id=?',[$event['payload'],$event['sequence_id']]); }
    check($s->verifyAudit($org),'Test audit restored and verified');
}
echo "$passed checks passed.\n";
