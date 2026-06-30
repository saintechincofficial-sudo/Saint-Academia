<?php
require_once __DIR__ . '/../config/database.php';

class StaffController {
    public static function index(): array {
        try {
            $pdo = getDatabaseConnection();
            $stmt = $pdo->query(
                'SELECT id, staff_number, first_name, last_name, role, email, phone, status FROM staff ORDER BY id DESC LIMIT 50'
            );

            return [
                'success' => true,
                'staff' => $stmt->fetchAll(),
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to load staff',
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

        $staffNumber = trim((string) ($body['staff_number'] ?? ''));
        $firstName = trim((string) ($body['first_name'] ?? ''));
        $lastName = trim((string) ($body['last_name'] ?? ''));
        $role = trim((string) ($body['role'] ?? 'Teacher'));

        if ($staffNumber === '' || $firstName === '' || $lastName === '') {
            return ['success' => false, 'message' => 'Staff number, first name and last name are required'];
        }

        try {
            $pdo = getDatabaseConnection();
            $schoolId = self::ensureSchool();

            $stmt = $pdo->prepare(
                'INSERT INTO staff (school_id, staff_number, first_name, last_name, role, email, phone, status, created_at)
                 VALUES (:school_id, :staff_number, :first_name, :last_name, :role, :email, :phone, :status, NOW())'
            );

            $stmt->execute([
                ':school_id' => $schoolId,
                ':staff_number' => $staffNumber,
                ':first_name' => $firstName,
                ':last_name' => $lastName,
                ':role' => $role,
                ':email' => trim((string) ($body['email'] ?? '')),
                ':phone' => trim((string) ($body['phone'] ?? '')),
                ':status' => 'active',
            ]);

            return [
                'success' => true,
                'message' => 'Staff created successfully',
                'staff' => [
                    'id' => (int) $pdo->lastInsertId(),
                    'staff_number' => $staffNumber,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'role' => $role,
                    'email' => trim((string) ($body['email'] ?? '')),
                    'phone' => trim((string) ($body['phone'] ?? '')),
                    'status' => 'active',
                ],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to create staff',
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
