<?php
declare(strict_types=1);
namespace AiGovernanceWP;

/** Small adapter for the shared workflow's prepared queries and transactions. */
final class Database {
    private bool $transaction = false;
    public function __construct(public \wpdb $connection) {}
    public function prepare(string $sql): Statement { return new Statement($this, $this->tables($sql)); }
    public function exec(string $sql): int { return $this->run($this->tables($sql)); }
    private function tables(string $sql): string {
        requireThat(preg_match('/^[a-zA-Z0-9_]+$/', $this->connection->prefix) === 1, 'Unsupported database prefix.', 500);
        // Rewrite only trusted SQL before binding, never text in user-supplied values.
        return preg_replace('/\bgovernance_(organizations|cases|policies|audit|snapshots)\b/', $this->connection->prefix.'aigwp_$1', $sql);
    }
    public function beginTransaction(): void {
        requireThat(!$this->transaction, 'A transaction is already active.', 500);
        $this->run('START TRANSACTION'); $this->transaction = true;
    }
    public function commit(): void { $this->run('COMMIT'); $this->transaction = false; }
    public function rollBack(): void { $this->run('ROLLBACK'); $this->transaction = false; }
    public function inTransaction(): bool { return $this->transaction; }
    public function run(string $sql): int {
        // Only trusted application SQL reaches this adapter. Values are bound below.
        $previous = $this->connection->suppress_errors(true);
        try {
            $result = $this->connection->query($sql);
            if ($result === false) throw new \RuntimeException('Governance database operation failed.');
            return (int)$result;
        } finally { $this->connection->suppress_errors($previous); }
    }
}

final class Statement {
    private array $rows = [];
    private int $position = 0;
    public function __construct(private Database $database, private string $sql) {}
    public function execute(array $params = []): void {
        requireThat(substr_count($this->sql, '?') === count($params), 'Incorrect query parameters.', 500);
        $index = 0; $values = [];
        $sql = preg_replace_callback('/\?/', function () use (&$index, &$values, $params): string {
            $value = $params[$index++];
            if ($value === null) return 'NULL';
            requireThat(is_scalar($value), 'Invalid query parameter.', 500);
            $values[] = $value;
            return is_int($value) ? '%d' : '%s';
        }, str_replace('%', '%%', $this->sql));
        if ($values) $sql = $this->database->connection->prepare($sql, ...$values);
        $this->database->run($sql);
        $this->rows = array_map(static fn($row) => (array)$row, $this->database->connection->last_result ?? []);
        $this->position = 0;
    }
    public function fetch(): array|false { return $this->rows[$this->position++] ?? false; }
    public function fetchAll(): array { return array_slice($this->rows, $this->position); }
    public function fetchColumn(int $column = 0): mixed {
        $row = $this->fetch(); return $row === false ? false : (array_values($row)[$column] ?? false);
    }
}
