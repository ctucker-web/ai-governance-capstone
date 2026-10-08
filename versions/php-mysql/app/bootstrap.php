<?php
declare(strict_types=1);
namespace Governance;
require_once __DIR__.'/domain.php';
require_once __DIR__.'/store.php';
require_once __DIR__.'/workflow.php';
function configuration(): array {
    static $config;
    if ($config !== null) return $config;
    $path=getenv('GOVERNANCE_CONFIG') ?: dirname(__DIR__).'/config.local.php';
    requireThat(is_file($path),'The PHP/MySQL Version has not been configured.',503);
    $config=require $path;
    requireThat(is_array($config) && strlen($config['audit_key'] ?? '')>=32 && !str_starts_with($config['audit_key'],'REPLACE_') && isset($config['dsn'],$config['db_user'],$config['db_password'],$config['app_url']),'Application configuration is incomplete.',503);
    return $config;
}
function connect(): Store {
    $c=configuration();
    $pdo=new \PDO($c['dsn'],$c['db_user'],$c['db_password'],[\PDO::ATTR_ERRMODE=>\PDO::ERRMODE_EXCEPTION,\PDO::ATTR_DEFAULT_FETCH_MODE=>\PDO::FETCH_ASSOC,\PDO::ATTR_EMULATE_PREPARES=>false]);
    $pdo->exec("SET time_zone = '+00:00'");
    return new Store($pdo,$c['audit_key']);
}
function sessionStart(): void {
    $c=configuration(); $path=parse_url($c['app_url'],PHP_URL_PATH) ?: '/';
    ini_set('session.use_strict_mode','1'); ini_set('session.use_only_cookies','1'); ini_set('session.gc_maxlifetime','28800');
    session_name('governance_php'); session_set_cookie_params(['lifetime'=>0,'path'=>rtrim($path,'/').'/','secure'=>str_starts_with($c['app_url'],'https://'),'httponly'=>true,'samesite'=>'Strict']); session_start();
    if (isset($_SESSION['expires']) && $_SESSION['expires']<=time()) $_SESSION=[];
    if (!isset($_SESSION['csrf'])) $_SESSION['csrf']=bin2hex(random_bytes(32));
}
function authenticate(Store $s): array {
    requireThat(isset($_SESSION['subject'],$_SESSION['expires']) && $_SESSION['expires']>time(),'Please sign in to continue.',401);
    return $s->user(identifier($_SESSION['subject']));
}
function protectMutation(): void {
    $c=configuration(); $parts=parse_url($c['app_url']);
    $origin=$parts['scheme'].'://'.$parts['host'].(isset($parts['port']) ? ':'.$parts['port'] : '');
    requireThat(($_SERVER['HTTP_ORIGIN'] ?? '') === $origin,'This action must come from the application.',403);
    $provided=$_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    requireThat(is_string($provided) && hash_equals($_SESSION['csrf'],$provided),'Session verification failed. Refresh and try again.',403);
}
function requestData(): array {
    requireThat(str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''),'application/json'),'Use JSON requests.',415);
    $raw=file_get_contents('php://input',false,null,0,100001);
    requireThat($raw !== false && strlen($raw)<=100000,'Request is too large.',413);
    try { $value=json_decode($raw,true,32,JSON_THROW_ON_ERROR); } catch (\JsonException) { throw new Problem(400,'The request could not be read.'); }
    requireThat(is_array($value) && !array_is_list($value),'Use a JSON object.'); return $value;
}
