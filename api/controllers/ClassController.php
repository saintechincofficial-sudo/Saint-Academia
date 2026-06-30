<?php
require_once __DIR__ . '/../config/database.php';

class ClassController {
    public static function index(): array {
        try {
            $pdo = getDatabaseConnection();
            $stmt = $pdo->query(
                'SELECT c.id, c.name, c.stream, c.room, cl.name as level_name FROM classes c LEFT JOIN class_levels cl ON cl.id = c.level_id ORDER BY c.id DESC LIMIT 50'
            );

            return [
                'success' => true,
                'classes' => $stmt->fetchAll(),
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to load classes',
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
        $stream = trim((string) ($body['stream'] ?? ''));
        $room = trim((string) ($body['room'] ?? ''));

        if ($name === '') {
            return ['success' => false, 'message' => 'Class name is required'];
        }

        try {
            $pdo = getDatabaseConnection();
            $schoolId = self::ensureSchool();
            $levelId = self::ensureLevel($pdo, $schoolId);
            $academicYearId = self::ensureAcademicYear($pdo, $schoolId);

            $stmt = $pdo->prepare(
                'INSERT INTO classes (school_id, level_id, name, stream, academic_year_id, room)
                 VALUES (:school_id, :level_id, :name, :stream, :academic_year_id, :room)'
            );

            $stmt->execute([
                ':school_id' => $schoolId,
                ':level_id' => $levelId,
                ':name' => $name,
                ':stream' => $stream,
                ':academic_year_id' => $academicYearId,
                ':room' => $room,
            ]);

            return [
                'success' => true,
                'message' => 'Class created successfully',
                'class' => [
                    'id' => (int) $pdo->lastInsertId(),
                    'name' => $name,
                    'stream' => $stream,
                    'room' => $room,
                ],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to create class',
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

    private static function ensureLevel(PDO $pdo, int $schoolId): int {
        $stmt = $pdo->prepare('SELECT id FROM class_levels WHERE school_id = ? LIMIT 1');
        $stmt->execute([$schoolId]);
        $level = $stmt->fetch();

        if ($level) {
            return (int) $level['id'];
        }

        $stmt = $pdo->prepare('INSERT INTO class_levels (school_id, name, name_fr, order_no) VALUES (?, ?, ?, ?)');
        $stmt->execute([$schoolId, 'Secondary', 'Secondaire', 1]);

        return (int) $pdo->lastInsertId();
    }

    private static function ensureAcademicYear(PDO $pdo, int $schoolId): int {
        $stmt = $pdo->prepare('SELECT id FROM academic_years WHERE school_id = ? ORDER BY id DESC LIMIT 1');
        $stmt->execute([$schoolId]);
        $year = $stmt->fetch();

        if ($year) {
            return (int) $year['id'];
        }

        $stmt = $pdo->prepare('INSERT INTO academic_years (school_id, label, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$schoolId, '2026/2027', date('Y-m-d'), date('Y-m-d', strtotime('+1 year')), 1]);

        return (int) $pdo->lastInsertId();
    }
}
