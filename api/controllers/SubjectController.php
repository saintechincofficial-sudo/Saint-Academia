<?php
require_once __DIR__ . '/../config/database.php';

class SubjectController {
    public static function index(): array {
        try {
            $pdo = getDatabaseConnection();
            $stmt = $pdo->query('SELECT id, name, code FROM subjects ORDER BY name ASC');

            return [
                'success' => true,
                'subjects' => $stmt->fetchAll(),
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to load subjects',
                'error' => $e->getMessage(),
            ];
        }
    }

    public static function create(): array {
        $rawBody = file_get_contents('php://input');
        $body = [];

        if (!empty($rawBody)) {
            $decodedJson = json_decode($rawBody, true);
            if (is_array($decodedJson)) {
                $body = $decodedJson;
            } else {
                parse_str($rawBody, $body);
            }
        }

        if ($body === []) {
            $body = $_POST;
        }

        $name = trim((string) ($body['name'] ?? ''));
        $code = trim((string) ($body['code'] ?? ''));

        if ($name === '') {
            return ['success' => false, 'message' => 'Subject name is required'];
        }

        try {
            $pdo = getDatabaseConnection();
            $schoolId = self::ensureSchool();

            $stmt = $pdo->prepare('INSERT INTO subjects (school_id, name, code) VALUES (:school_id, :name, :code)');
            $stmt->execute([
                ':school_id' => $schoolId,
                ':name' => $name,
                ':code' => $code,
            ]);

            return [
                'success' => true,
                'message' => 'Subject created successfully',
                'subject' => [
                    'id' => (int) $pdo->lastInsertId(),
                    'name' => $name,
                    'code' => $code,
                ],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to create subject',
                'error' => $e->getMessage(),
            ];
        }
    }

    private static function ensureSchool(): int {
        $pdo = getDatabaseConnection();

        $stmt = $pdo->query('SELECT id FROM schools ORDER BY id LIMIT 1');
        $school = $stmt->fetch();

        if ($school) {
            return (int) $school['id'];
        }

        $pdo->prepare('INSERT INTO schools (name, email) VALUES (?, ?)')->execute([
            'SaintAcademia',
            'info@saintacademia.com',
        ]);

        return (int) $pdo->lastInsertId();
    }
}
