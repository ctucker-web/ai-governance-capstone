<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') exit(1);
$destination=getenv('GOVERNANCE_CONFIG');
if (!$destination || is_file($destination)) throw new RuntimeException('Provide a new test configuration path.');
$config=['dsn'=>'mysql:host=127.0.0.1;port=3306;dbname=governance_php_test;charset=utf8mb4',
    'db_user'=>'root','db_password'=>getenv('MYSQL_PASSWORD'),'audit_key'=>bin2hex(random_bytes(32)),
    'app_url'=>'http://localhost:3200/ai/','demo_enabled'=>true];
if (!is_dir(dirname($destination))) mkdir(dirname($destination),0700,true);
file_put_contents($destination,"<?php\nreturn ".var_export($config,true).";\n");
chmod($destination,0600);
