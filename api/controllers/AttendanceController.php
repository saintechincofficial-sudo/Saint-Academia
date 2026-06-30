<?php
require_once __DIR__ . '/../config/database.php';

class AttendanceController {
    public static function index(): array {
        try {
            $pdo = getDatabaseConnection();
            $stmt = $pdo->query(
                'SELECT a.id, s2.session_date, c.name as class_name, s.first_name, s.last_name, a.status FROM attendance_records a JOIN attendance_sessions s2 ON s2.id = a.session_id JOIN students s ON s.id = a.student_id JOIN classes c ON c.id = s2.class_id ORDER BY a.id DESC LIMIT 100'
            );

            return [
                'success' => true,
                'attendance' => $stmt->fetchAll(),
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to load attendance',
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

        $studentId = (int) ($body['student_id'] ?? 0);
        $classId = (int) ($body['class_id'] ?? 0);
        $status = trim((string) ($body['status'] ?? 'present'));
        $sessionDate = trim((string) ($body['session_date'] ?? date('Y-m-d')));

        if ($studentId <= 0 || $classId <= 0) {
            return ['success' => false, 'message' => 'Student and class are required'];
        }

        try {
            $pdo = getDatabaseConnection();
            $schoolId = self::ensureSchool();

            $sessionStmt = $pdo->prepare(
                'INSERT INTO attendance_sessions (school_id, class_id, session_date, created_by, created_at)
                 VALUES (:school_id, :class_id, :session_date, 1, NOW())'
            );
            $sessionStmt->execute([
                ':school_id' => $schoolId,
                ':class_id' => $classId,
                ':session_date' => $sessionDate,
            ]);

            $sessionId = (int) $pdo->lastInsertId();

            $recordStmt = $pdo->prepare(
                'INSERT INTO attendance_records (session_id, student_id, status, marked_at)
                 VALUES (:session_id, :student_id, :status, NOW())'
            );
            $recordStmt->execute([
                ':session_id' => $sessionId,
                ':student_id' => $studentId,
                ':status' => $status,
            ]);

            return [
                'success' => true,
                'message' => 'Attendance recorded successfully',
                'attendance' => [
                    'student_id' => $studentId,
                    'class_id' => $classId,
                    'status' => $status,
                    'session_date' => $sessionDate,
                ],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to record attendance',
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
