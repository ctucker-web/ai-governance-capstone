<?php
declare(strict_types=1);
// Development server only: php -S localhost:3200 bin/dev-router.php
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if ($path==='/ai') { header('Location: /ai/'); return; }
if (!is_string($path) || !str_starts_with($path,'/ai/')) { http_response_code(404); return; }
$relative=substr($path,4);
if ($relative==='' || $relative==='index.php') { require dirname(__DIR__).'/public/index.php'; return; }
if ($relative==='api.php') { require dirname(__DIR__).'/public/api.php'; return; }
if (in_array($relative,['assets/app.js','assets/app.css'],true)) {
    header('Content-Type: '.(str_ends_with($relative,'.js')?'application/javascript':'text/css'));
    readfile(dirname(__DIR__).'/public/'.$relative); return;
}
http_response_code(404);
