<?php
function loadEnv(): array {
    $envFile = __DIR__ . '/../../.env';
    if (!file_exists($envFile)) {
        return [];
    }

    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];

    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#')) {
            continue;
        }

        [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
        $env[trim($key)] = trim($value, " \t\n\r\0\x0B\"");
    }

    return $env;
}

function getDatabaseConnection(): PDO {
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $env = loadEnv();
    $host = $env['DB_HOST'] ?? getenv('DB_HOST') ?: '127.0.0.1';
    $port = $env['DB_PORT'] ?? getenv('DB_PORT') ?: '3306';
    $dbName = $env['DB_NAME'] ?? getenv('DB_NAME') ?: 'saint_academia';
    $user = $env['DB_USER'] ?? getenv('DB_USER') ?: 'root';
    $pass = $env['DB_PASS'] ?? getenv('DB_PASS') ?: '';

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $dbName);

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}
