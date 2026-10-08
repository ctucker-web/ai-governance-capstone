<?php
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';

use function Governance\\assess;
use function Governance\\catalog;

$dimensions = array_column(catalog()['dimensions'], 'key');
$zero = array_fill_keys($dimensions, 0);
$settings = catalog()['defaultConfig'];
$scenarios = [
    [$zero, 'GENERAL'],
    [array_replace($zero, ['dataSensitivity' => 3, 'vendorAssurance' => 2]), 'GENERAL'],
    [array_replace($zero, ['autonomy' => 3]), 'CLINICAL'],
    [array_fill_keys($dimensions, 3), 'EMPLOYMENT']
];
$warmup = 1000;
$count = 20000;
for ($i = 0; $i < $warmup; ++$i) {
    [$answers, $domain] = $scenarios[$i % count($scenarios)];
    assess($answers, $domain, $settings);
}
$latencies = [];
$start = hrtime(true);
for ($i = 0; $i < $count; ++$i) {
    [$answers, $domain] = $scenarios[$i % count($scenarios)];
    $sampleStart = hrtime(true);
    assess($answers, $domain, $settings);
    $latencies[] = (hrtime(true) - $sampleStart) / 1000000.0;
}
$elapsedSeconds = (hrtime(true) - $start) / 1000000000.0;
sort($latencies, SORT_NUMERIC);
$p95 = $latencies[(int) ceil(count($latencies) * 0.95) - 1];
$average = array_sum($latencies) / count($latencies);
printf("PHP risk engine benchmark (synthetic, CLI, runner-dependent)\\n");
printf("PHP version: %s\\n", PHP_VERSION);
printf("Risk evaluations: %d\\n", $count);
printf("Elapsed seconds: %.4f\\n", $elapsedSeconds);
printf("Throughput evaluations/sec: %.2f\\n", $count / $elapsedSeconds);
printf("Mean algorithm duration ms: %.4f\\n", $average);
printf("P95 algorithm duration ms: %.4f\\n", $p95);
printf("Peak PHP memory MiB: %.2f\\n", memory_get_peak_usage(true)/1048576);
