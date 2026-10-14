<?php
// Copy to config.local.php OUTSIDE the public web directory. Never commit real values.
return [
    'dsn' => 'mysql:host=MYSQL_HOST;dbname=DATABASE_NAME;charset=utf8mb4',
    'db_user' => 'DATABASE_USER',
    'db_password' => 'REPLACE_LOCALLY',
    'audit_key' => 'REPLACE_WITH_A_UNIQUE_RANDOM_SECRET',
    'app_url' => 'https://www.changedevelop.org/ai/',
    'demo_enabled' => false,
];
