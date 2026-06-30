<?php
require_once __DIR__ . '/../config/database.php';

class StudentController {
    public static function index(): array {
        try {
            $pdo = getDatabaseConnection();
            $stmt = $pdo->query(
                'SELECT id, student_number, first_name, last_name, email, phone, status FROM students ORDER BY id DESC LIMIT 50'
            );

            return [
                'success' => true,
                'students' => $stmt->fetchAll(),
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to load students',
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

        $studentNumber = trim((string) ($body['student_number'] ?? ''));
        $firstName = trim((string) ($body['first_name'] ?? ''));
        $lastName = trim((string) ($body['last_name'] ?? ''));
        $email = trim((string) ($body['email'] ?? ''));
        $phone = trim((string) ($body['phone'] ?? ''));

        if ($studentNumber === '' || $firstName === '' || $lastName === '') {
            return ['success' => false, 'message' => 'Student number, first name and last name are required'];
        }

        try {
            $pdo = getDatabaseConnection();
            $schoolId = self::ensureSchool();

            $stmt = $pdo->prepare(
                'INSERT INTO students (school_id, student_number, first_name, last_name, email, phone, status, created_at)
                 VALUES (:school_id, :student_number, :first_name, :last_name, :email, :phone, :status, NOW())'
            );

            $stmt->execute([
                ':school_id' => $schoolId,
                ':student_number' => $studentNumber,
                ':first_name' => $firstName,
                ':last_name' => $lastName,
                ':email' => $email,
                ':phone' => $phone,
                ':status' => 'active',
            ]);

            return [
                'success' => true,
                'message' => 'Student created successfully',
                'student' => [
                    'id' => (int) $pdo->lastInsertId(),
                    'student_number' => $studentNumber,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $email,
                    'phone' => $phone,
                    'status' => 'active',
                ],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to create student',
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
