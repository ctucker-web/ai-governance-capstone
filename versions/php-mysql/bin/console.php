<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/app/bootstrap.php';
require dirname(__DIR__).'/app/seed.php';
try {
    $store=Governance\connect();
    switch ($argv[1] ?? '') {
        case 'migrate': Governance\migrate($store); echo "Schema ready.\n"; break;
        case 'seed': Governance\seed($store); echo "Synthetic demonstration records ready.\n"; break;
        case 'verify-audit':
            foreach ($store->query('SELECT id FROM governance_organizations')->fetchAll() as $org) {
                if (!$store->verifyAudit($org['id'])) throw new RuntimeException('Audit integrity check failed.');
            }
            echo "Audit chains verified.\n"; break;
        default: throw new RuntimeException('Usage: php bin/console.php migrate|seed|verify-audit');
    }
} catch (Throwable $e) { fwrite(STDERR,$e->getMessage()."\n"); exit(1); }
