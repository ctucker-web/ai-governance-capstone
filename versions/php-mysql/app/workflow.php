<?php
declare(strict_types=1);
namespace Governance;

function execute(Store $store, array $actor, array $command): array {
    $action=$command['action'] ?? '';
    requireThat(in_array($action,['create','edit','submit','decision','information','evidence','addMitigation','mitigation','reassess','archive','configure'],true),'Unknown action.');
    $store->db->beginTransaction();
    try {
        // Serialize one organization's changes, including audit-chain writes, without shared-host triggers.
        $locked=$store->query('SELECT id FROM governance_organizations WHERE id=? FOR UPDATE',[$actor['organizationId']])->fetchColumn();
        requireThat($locked !== false,'Organization unavailable.',403);
        if ($action === 'configure') {
            requireThat(hasRole($actor,'ADMINISTRATOR'),'Administrator access is required.',403);
            $old=$store->configuration($actor['organizationId']);
            requireThat(($command['version'] ?? null) === $old['version'],'Policy changed. Refresh before saving.',409);
            $settings=policy($command['settings'] ?? null); $routing=[]; $names=[];
            foreach (['LOW','MODERATE','HIGH','EXECUTIVE_EXCEPTION'] as $tier) {
                $u=$store->user(identifier($command['routing'][$tier] ?? null));
                requireThat($u['organizationId'] === $actor['organizationId'] && hasRole($u,'REVIEWER'),'Select a reviewer in your organization.');
                $routing[$tier]=$u['id']; $names[]="$tier: ".$u['name'].' ('.$u['id'].')';
            }
            $id=uuid(); $version=$old['version']+1;
            $store->query('INSERT INTO governance_policies(id,organization_id,version,settings,routing,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))',[$id,$actor['organizationId'],$version,json_encode($settings,JSON_THROW_ON_ERROR),json_encode($routing,JSON_THROW_ON_ERROR)]);
            $store->audit($actor,'CONFIGURATION_CHANGED',null,"Policy version $version; scoring and reassessment settings saved. Routing: ".implode('; ',$names).'.');
            $store->db->commit(); return ['id'=>$id];
        }
        if ($action === 'create') {
            requireThat(hasRole($actor,'REQUESTER'),'Requester access is required.',403);
            $data=intake($command['data'] ?? null); $id=uuid();
            $r=$data+['id'=>$id,'organizationId'=>$actor['organizationId'],'requesterId'=>$actor['id'],'requester'=>['id'=>$actor['id'],'name'=>$actor['name']],
                'system'=>['id'=>uuid(),'name'=>$data['toolName'],'vendor'=>$data['vendor']],'status'=>'DRAFT','revision'=>0,'assessments'=>[],'reviews'=>[],'evidence'=>[],'mitigations'=>[],'reassessments'=>[],
                'reviewedAt'=>null,'nextReviewAt'=>null,'reviewIntervalDays'=>null,'createdAt'=>now(),'updatedAt'=>now()];
            $store->save($r,true); $store->audit($actor,'REQUEST_CREATED',$id,'Governance draft created.',null,'DRAFT');
            $store->db->commit(); return ['id'=>$id];
        }
        $id=identifier($command['id'] ?? null); $r=$store->record($id,$actor['organizationId']);
        requireThat(visible($actor,$r),'This record is unavailable.',404);
        $owner=hasRole($actor,'REQUESTER') && $actor['id'] === $r['requesterId']; $reviewer=assigned($actor,$r); $active=null;
        foreach ($r['reviews'] as $index=>$review) if ($review['closedAt'] === null && $review['decision'] === null && $review['reviewerId'] === $actor['id']) { $active=$index; break; }
        if (in_array($action,['edit','submit','decision','information','reassess','archive'],true)) requireThat(is_int($command['revision'] ?? null) && $command['revision'] === $r['revision'],'This record changed. Refresh and try again.',409);
        $oldStatus=$r['status']; $events=[];
        $event=function(string $name,string $message,?string $from=null,?string $to=null) use (&$events): void { $events[]=[$name,$message,$from,$to]; };
        $newMitigation=function(array $data) use($store,$actor,&$r): array {
            $ownerId=identifier($data['ownerId'] ?? null); $u=$store->user($ownerId);
            $eligible=$ownerId === $r['requesterId'] && hasRole($u,'REQUESTER');
            foreach ($r['reviews'] as $review) if ($review['reviewerId'] === $ownerId && hasRole($u,'REVIEWER')) $eligible=true;
            requireThat($u['organizationId'] === $actor['organizationId'] && $eligible,'Mitigation owner must be the requester or an assigned reviewer.');
            return ['id'=>uuid(),'useCaseId'=>$r['id'],'description'=>text($data,'description'),'ownerId'=>$ownerId,'owner'=>['id'=>$ownerId,'name'=>$u['name']],
                'dueAt'=>dateValue($data['dueAt'] ?? null),'status'=>'OPEN','completionNotes'=>'','createdAt'=>now(),'updatedAt'=>now()];
        };
        if ($action === 'edit') {
            requireThat($owner && in_array($oldStatus,['DRAFT','NEEDS_INFORMATION'],true),'Only the requester may edit a draft or follow-up.',403);
            $data=intake($command['data'] ?? null); $r=array_replace($r,$data); $r['system']['name']=$data['toolName']; $r['system']['vendor']=$data['vendor'];
            $event('REQUEST_UPDATED','Request details updated; previous assessment snapshots retained.');
        } elseif ($action === 'submit') {
            requireThat($owner && in_array($oldStatus,['DRAFT','NEEDS_INFORMATION'],true),'Only the requester may submit a draft or follow-up.',403);
            $data=intake($r); $config=$store->configuration($actor['organizationId']); $result=assess($data['answers'],$data['domain'],$config['settings']);
            $reviewerId=$config['routing'][$result['tier']] ?? null;
            requireThat(is_string($reviewerId) && $reviewerId !== $actor['id'],'An administrator must assign an independent reviewer for this tier.',409);
            $u=$store->user($reviewerId); requireThat($u['organizationId'] === $actor['organizationId'] && hasRole($u,'REVIEWER'),'No eligible reviewer is configured.',409);
            foreach ($r['reviews'] as &$review) if ($review['closedAt'] === null) $review['closedAt']=now(); unset($review);
            $version=count($r['assessments'])+1;
            $assessment=$result+['id'=>uuid(),'useCaseId'=>$id,'version'=>$version,'configurationId'=>$config['id'],'inputSnapshot'=>$data,'policySnapshot'=>$config['settings'],'createdAt'=>now()];
            foreach ($assessment['factors'] as &$factor) $factor['id']=uuid(); unset($factor);
            array_unshift($r['assessments'],$assessment);
            array_unshift($r['reviews'],['id'=>uuid(),'useCaseId'=>$id,'assessmentId'=>$assessment['id'],'reviewerId'=>$u['id'],'reviewer'=>['id'=>$u['id'],'name'=>$u['name']],'closedAt'=>null,'decision'=>null,'createdAt'=>now()]);
            $r['status']='UNDER_REVIEW'; $store->snapshot($id,'assessment',$version,$assessment);
            $event('REQUEST_SUBMITTED','Request submitted for human review.',$oldStatus,'SUBMITTED');
            $event('RISK_ASSESSMENT_COMPLETED',"Assessment v$version: advisory ".$result['tier'].', score '.$result['score'].'; policy v'.$config['version'].'.');
            $event('REVIEW_ASSIGNED','Assigned to '.$u['name'].'.','SUBMITTED','UNDER_REVIEW');
        } elseif ($action === 'decision' || $action === 'information') {
            requireThat($reviewer && $active !== null && in_array($oldStatus,['UNDER_REVIEW','SUBMITTED'],true),'Only the assigned independent reviewer may act on this pending review.',403);
            if ($action === 'information') { $message=text($command,'message'); $r['status']='NEEDS_INFORMATION'; $event('MORE_INFORMATION_REQUESTED',$message,$oldStatus,$r['status']); }
            else {
                $outcome=$command['outcome'] ?? null;
                requireThat(in_array($outcome,['APPROVED','CONDITIONALLY_APPROVED','REJECTED'],true),'Invalid decision.');
                $rationale=text($command,'rationale'); $mitigations=$command['mitigations'] ?? null;
                requireThat(is_array($mitigations) && count($mitigations)<=20 && ($outcome !== 'CONDITIONALLY_APPROVED' || count($mitigations)>0),'Conditional approval requires at least one mitigation.');
                foreach ($mitigations as $m) { requireThat(is_array($m),'Invalid mitigation.'); $r['mitigations'][]=$newMitigation($m); $event('MITIGATION_CREATED','Decision mitigation created.'); }
                $decision=['id'=>uuid(),'reviewId'=>$r['reviews'][$active]['id'],'outcome'=>$outcome,'rationale'=>$rationale,'createdAt'=>now()];
                $r['reviews'][$active]['decision']=$decision; $r['reviews'][$active]['closedAt']=now();
                $assessment=null; foreach ($r['assessments'] as $a) if ($a['id'] === $r['reviews'][$active]['assessmentId']) $assessment=$a;
                requireThat($assessment !== null,'Assessment is missing.',409);
                $store->snapshot($id,'decision',$assessment['version'],$decision);
                $days=$assessment['policySnapshot']['reassessmentDays']; $r['status']=$outcome; $r['reviewedAt']=now(); $r['reviewIntervalDays']=approved($outcome)?$days:null;
                $r['nextReviewAt']=approved($outcome)?gmdate('Y-m-d\TH:i:s\Z',time()+$days*86400):null;
                $event('DECISION_RECORDED','Named human reviewer recorded a decision and rationale.',$oldStatus,$outcome);
            }
        } elseif ($action === 'evidence') {
            requireThat($oldStatus !== 'ARCHIVED' && ($reviewer || ($owner && in_array($oldStatus,['DRAFT','UNDER_REVIEW','NEEDS_INFORMATION'],true))),'You cannot add evidence to this record.',403);
            $url=text($command,'reference',2000); requireThat(filter_var($url,FILTER_VALIDATE_URL)!==false && in_array(strtolower(parse_url($url,PHP_URL_SCHEME) ?? ''),['https','http'],true),'Use an http or https reference URL.');
            $e=['id'=>uuid(),'useCaseId'=>$id,'reviewerId'=>$actor['id'],'reviewer'=>['id'=>$actor['id'],'name'=>$actor['name']],'type'=>text($command,'type',160),'description'=>text($command,'description'),'reference'=>$url,'notes'=>text($command,'notes',4000,false),'createdAt'=>now(),'reviewedAt'=>isset($command['reviewedAt']) && $reviewer ? dateValue($command['reviewedAt']) : null];
            array_unshift($r['evidence'],$e); $event('EVIDENCE_ADDED','Evidence reference and metadata added.');
        } elseif ($action === 'addMitigation') {
            requireThat($reviewer && $oldStatus !== 'ARCHIVED','Only an assigned reviewer can add mitigations.',403);
            $r['mitigations'][]=$newMitigation($command); $event('MITIGATION_CREATED','Reviewer added a mitigation requirement.');
        } elseif ($action === 'mitigation') {
            $mid=identifier($command['mitigationId'] ?? null); $found=null;
            foreach ($r['mitigations'] as $i=>$m) if ($m['id'] === $mid) $found=$i;
            requireThat($found !== null,'Mitigation not found.',404); $m=$r['mitigations'][$found]; $status=$command['status'] ?? null;
            requireThat(in_array($status,['OPEN','IN_PROGRESS','COMPLETE','WAIVED'],true),'Invalid mitigation status.');
            requireThat($oldStatus !== 'ARCHIVED' && ($reviewer || ($owner && $m['ownerId'] === $actor['id'])) && ($status !== 'WAIVED' || $reviewer),'Only the owner or assigned reviewer may update this mitigation; waivers require a reviewer.',403);
            $notes=text($command,'notes',4000,in_array($status,['COMPLETE','WAIVED'],true));
            $r['mitigations'][$found]=array_replace($m,['status'=>$status,'completionNotes'=>$notes,'updatedAt'=>now()]);
            $event($status === 'COMPLETE' ? 'MITIGATION_COMPLETED':'MITIGATION_UPDATED',"Mitigation $mid: ".$m['status']." → $status. Notes: $notes");
        } elseif ($action === 'reassess') {
            requireThat(approved($oldStatus) && ($owner || $reviewer || hasRole($actor,'ADMINISTRATOR')),'Only an owner, assigned reviewer or administrator can reassess an approved use.',403);
            $reason=text($command,'reason'); $reassessment=['id'=>uuid(),'useCaseId'=>$id,'reason'=>$reason,'previousVersion'=>count($r['assessments']),'createdAt'=>now()];
            array_unshift($r['reassessments'],$reassessment); $store->snapshot($id,'reassessment',count($r['reassessments']),$reassessment);
            $r['status']='DRAFT'; $r['nextReviewAt']=null; $event('REASSESSMENT_STARTED',$reason,$oldStatus,'DRAFT');
        } elseif ($action === 'archive') {
            requireThat(hasRole($actor,'ADMINISTRATOR'),'Administrator access is required.',403);
            requireThat(approved($oldStatus) || $oldStatus === 'REJECTED','Finish the active review before archiving.',409);
            $r['status']='ARCHIVED'; $event('REQUEST_ARCHIVED',text($command,'reason'),$oldStatus,'ARCHIVED');
        }
        if (in_array($action,['edit','submit','decision','information','reassess','archive'],true)) $r['revision']++;
        $r['updatedAt']=now(); usort($r['mitigations'],fn($a,$b)=>strcmp($a['dueAt'],$b['dueAt'])); $store->save($r);
        foreach ($events as [$name,$message,$from,$to]) $store->audit($actor,$name,$id,$message,$from,$to);
        $store->db->commit(); return ['id'=>$id];
    } catch (\Throwable $e) { if ($store->db->inTransaction()) $store->db->rollBack(); throw $e; }
}
