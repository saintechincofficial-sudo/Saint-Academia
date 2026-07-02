<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/TenantContext.php';

class SchoolController {
    public static function index(): array {
        try {
            Auth::check();

            if (!TenantContext::isSuperAdmin()) {
                return ['success' => false, 'message' => 'Forbidden - Super admin access required'];
            }

            $pdo = getDatabaseConnection();
            $stmt = $pdo->prepare('SELECT id, name, name_fr, address, phone, email, is_active, created_at FROM schools ORDER BY id DESC');
            $stmt->execute();
            $schools = $stmt->fetchAll();

            return ['success' => true, 'schools' => $schools];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch schools', 'error' => $e->getMessage()];
        }
    }

    public static function current(): array {
        try {
            Auth::check();
            $schoolId = TenantContext::requireSchoolId();

            $pdo = getDatabaseConnection();
            $stmt = $pdo->prepare('SELECT id, name, name_fr, address, phone, email, is_active, created_at FROM schools WHERE id = ?');
            $stmt->execute([$schoolId]);
            $school = $stmt->fetch();

            if (!$school) {
                return ['success' => false, 'message' => 'School not found'];
            }

            return ['success' => true, 'school' => $school];
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch school', 'error' => $e->getMessage()];
        }
    }

    public static function show(): array {
        try {
            Auth::check();

            if (!TenantContext::isSuperAdmin()) {
                return ['success' => false, 'message' => 'Forbidden - Super admin access required'];
            }

            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'School ID is required'];
            }

            $pdo = getDatabaseConnection();
            $stmt = $pdo->prepare('SELECT id, name, name_fr, address, phone, email, is_active, created_at FROM schools WHERE id = ?');
            $stmt->execute([$id]);
            $school = $stmt->fetch();

            if (!$school) {
                return ['success' => false, 'message' => 'School not found'];
            }

            return ['success' => true, 'school' => $school];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch school', 'error' => $e->getMessage()];
        }
    }

    public static function update(): array {
        try {
            Auth::check();
            $userIsSuperAdmin = TenantContext::isSuperAdmin();
            $schoolId = null;

            if (isset($_GET['id']) && $userIsSuperAdmin) {
                $schoolId = (int) $_GET['id'];
            } else {
                $schoolId = TenantContext::requireSchoolId();
            }

            if (!$schoolId) {
                return ['success' => false, 'message' => 'School ID is required'];
            }

            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            if (empty($body)) {
                $body = $_POST ?? [];
            }

            $name = trim($body['name'] ?? '');
            $email = trim($body['email'] ?? '');
            $isActive = isset($body['is_active']) ? (bool) $body['is_active'] : null;

            if (empty($name)) {
                return ['success' => false, 'message' => 'School name is required'];
            }

            if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return ['success' => false, 'message' => 'School email is invalid'];
            }

            $pdo = getDatabaseConnection();
            $fields = ['name = ?', 'name_fr = ?', 'address = ?', 'phone = ?', 'email = ?'];
            $params = [
                $name,
                trim($body['name_fr'] ?? ''),
                trim($body['address'] ?? ''),
                trim($body['phone'] ?? ''),
                $email
            ];

            if ($isActive !== null) {
                if (!isset($_GET['id']) || $userIsSuperAdmin) {
                    $fields[] = 'is_active = ?';
                    $params[] = $isActive ? 1 : 0;
                } else {
                    return ['success' => false, 'message' => 'Forbidden - cannot change status for another school'];
                }
            }

            $params[] = $schoolId;

            $sql = 'UPDATE schools SET ' . implode(', ', $fields) . ' WHERE id = ?';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            $stmt = $pdo->prepare('SELECT id, name, name_fr, address, phone, email, is_active, created_at FROM schools WHERE id = ?');
            $stmt->execute([$schoolId]);
            $school = $stmt->fetch();

            return ['success' => true, 'message' => 'School updated successfully', 'school' => $school];
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to update school', 'error' => $e->getMessage()];
        }
    }

    public static function create(): array {
        try {
            Auth::check();

            if (!TenantContext::isSuperAdmin()) {
                return ['success' => false, 'message' => 'Forbidden - Super admin access required'];
            }

            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            if (empty($body)) {
                $body = $_POST ?? [];
            }

            $name = trim($body['name'] ?? '');
            $email = trim($body['email'] ?? '');
            $adminEmail = trim($body['admin_email'] ?? '');
            $adminPassword = trim($body['admin_password'] ?? '');

            if (empty($name)) {
                return ['success' => false, 'message' => 'School name is required'];
            }

            if (empty($adminEmail) || empty($adminPassword)) {
                return ['success' => false, 'message' => 'School admin email and password are required to onboard a new school'];
            }

            if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
                return ['success' => false, 'message' => 'Admin email is invalid'];
            }

            $pdo = getDatabaseConnection();
            $pdo->beginTransaction();

            $stmt = $pdo->prepare('INSERT INTO schools (name, name_fr, address, phone, email, is_active) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $name,
                trim($body['name_fr'] ?? ''),
                trim($body['address'] ?? ''),
                trim($body['phone'] ?? ''),
                $email,
                true
            ]);

            $schoolId = (int) $pdo->lastInsertId();

            if (!empty($adminEmail) && !empty($adminPassword)) {
                $passwordHash = password_hash($adminPassword, PASSWORD_BCRYPT);
                $userStmt = $pdo->prepare('INSERT INTO users (school_id, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)');
                $userStmt->execute([$schoolId, $adminEmail, $passwordHash, 'school_admin', true]);
            }

            $pdo->commit();

            return [
                'success' => true,
                'message' => 'School created successfully',
                'school' => [
                    'id' => $schoolId,
                    'name' => $name,
                    'email' => $email,
                    'is_active' => true
                ]
            ];
        } catch (Exception $e) {
            if (isset($pdo) && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return ['success' => false, 'message' => 'Failed to create school', 'error' => $e->getMessage()];
        }
    }
}
