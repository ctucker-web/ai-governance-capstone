<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
try {
    // Deployed file contains only the absolute bootstrap path, never credentials.
    $bootstrap=is_file(__DIR__.'/deployment-path.php') ? require __DIR__.'/deployment-path.php' : dirname(__DIR__).'/app/bootstrap.php';
    require_once $bootstrap;
    $store=\Governance\connect();
    $resource=$_GET['resource'] ?? ''; $method=$_SERVER['REQUEST_METHOD'];
    if ($resource === 'health' && $method === 'GET') { $store->query('SELECT 1'); echo json_encode(['status'=>'ok','version'=>'PHP/MySQL Version']); exit; }
    \Governance\sessionStart();
    if ($resource === 'session' && $method === 'GET') {
        $result=['csrf'=>$_SESSION['csrf'],'demoEnabled'=>(\Governance\configuration()['demo_enabled'] ?? false) === true];
    } else {
        if ($method !== 'GET') \Governance\protectMutation();
        if ($resource === 'session' && $method === 'POST') {
            \Governance\requireThat((\Governance\configuration()['demo_enabled'] ?? false) === true,'Demo sign-in is disabled.',403);
            $data=\Governance\requestData(); $id=\Governance\identifier($data['id'] ?? null);
            $allowed=array_column(\Governance\catalog()['demoUsers'],'id');
            \Governance\requireThat(in_array($id,$allowed,true),'Choose an available demonstration identity.',403);
            $store->user($id); session_regenerate_id(true);
            $_SESSION=['subject'=>$id,'expires'=>time()+28800,'csrf'=>bin2hex(random_bytes(32))];
            $result=['ok'=>true,'csrf'=>$_SESSION['csrf']];
        } elseif ($resource === 'session' && $method === 'DELETE') {
            $_SESSION=[]; session_regenerate_id(true); $_SESSION['csrf']=bin2hex(random_bytes(32)); $result=['ok'=>true,'csrf'=>$_SESSION['csrf']];
        } elseif ($resource === 'workspace') {
            $actor=\Governance\authenticate($store);
            if ($method === 'GET') $result=$store->workspace($actor);
            elseif ($method === 'POST') $result=\Governance\execute($store,$actor,\Governance\requestData());
            else throw new \Governance\Problem(405,'Method not allowed.');
        } else throw new \Governance\Problem(404,'Resource not found.');
    }
    echo json_encode($result,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
} catch (\Throwable $error) {
    $known=$error instanceof \Governance\Problem;
    http_response_code($known ? $error->status : 500);
    if (!$known) error_log('Governance PHP operation failed: '.get_class($error));
    echo json_encode(['error'=>$known ? $error->getMessage() : 'The operation could not be completed. Please refresh and try again.']);
}
