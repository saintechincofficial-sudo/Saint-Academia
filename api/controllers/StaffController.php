<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/TenantContext.php';
require_once __DIR__ . '/../models/Staff.php';

class StaffController {
    public static function index(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $model = new Staff();
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 25;
            $search = isset($_GET['search']) ? trim($_GET['search']) : '';

            if (!empty($search)) {
                $staff = $model->search($search, $page, $limit);
                $total = $model->searchCount($search);
            } else {
                $staff = $model->getAll($page, $limit);
                $total = $model->getCount();
            }

            $pages = $limit > 0 ? (int) ceil($total / $limit) : 1;

            return [
                'success' => true,
                'staff' => $staff,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $pages,
                    'total_items' => $total,
                    'per_page' => $limit,
                ],
            ];
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch staff', 'error' => $e->getMessage()];
        }
    }

    public static function show(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Staff ID is required'];
            }

            $model = new Staff();
            $staff = $model->getById($id);
            if (!$staff) {
                return ['success' => false, 'message' => 'Staff member not found'];
            }

            return ['success' => true, 'staff' => $staff];
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch staff member', 'error' => $e->getMessage()];
        }
    }

    public static function create(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            if (empty($body)) {
                $body = $_POST ?? [];
            }

            $model = new Staff();
            return $model->create($body);
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to create staff member', 'error' => $e->getMessage()];
        }
    }

    public static function update(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Staff ID is required'];
            }

            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            if (empty($body)) {
                $body = $_POST ?? [];
            }

            $model = new Staff();
            return $model->update($id, $body);
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to update staff member', 'error' => $e->getMessage()];
        }
    }

    public static function delete(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Staff ID is required'];
            }

            $model = new Staff();
            return $model->delete($id);
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to delete staff member', 'error' => $e->getMessage()];
        }
    }

    public static function uploadPhoto(): array
    {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) return ['success' => false, 'message' => 'Staff ID is required'];

            if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
                return ['success' => false, 'message' => 'No photo uploaded or upload error'];
            }

            $file    = $_FILES['photo'];
            $ext     = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg','jpeg','png','webp'];
            if (!in_array($ext, $allowed)) {
                return ['success' => false, 'message' => 'Only JPG, PNG or WEBP images allowed'];
            }
            if ($file['size'] > 2 * 1024 * 1024) {
                return ['success' => false, 'message' => 'Photo must be under 2MB'];
            }

            $uploadDir = __DIR__ . '/../../uploads/staff/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

            $filename = 'staff_' . $id . '_' . time() . '.' . $ext;
            $dest     = $uploadDir . $filename;

            if (!move_uploaded_file($file['tmp_name'], $dest)) {
                return ['success' => false, 'message' => 'Failed to save photo'];
            }

            $path     = '/uploads/staff/' . $filename;
            $pdo      = getDatabaseConnection();
            $schoolId = TenantContext::getSchoolId(1);
            $pdo->prepare('UPDATE staff SET photo_path = ? WHERE id = ? AND school_id = ?')
                ->execute([$path, $id, $schoolId]);

            return ['success' => true, 'message' => 'Photo uploaded', 'photo_path' => $path];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Upload failed', 'error' => $e->getMessage()];
        }
    }
}

    public static function createLogin(): array
    {
        try {
            Auth::check();
            $body      = json_decode(file_get_contents('php://input'), true) ?? [];
            $staffId   = (int)($body['staff_id']  ?? 0);
            $password  = trim($body['password']   ?? '');
            $roles     = $body['roles']            ?? ['teacher'];
            $username  = trim($body['username']    ?? '');

            if (!$staffId || !$password) {
                return ['success' => false, 'message' => 'staff_id and password are required'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            // Get staff member
            $stmt = $pdo->prepare('SELECT * FROM staff WHERE id = ? AND school_id = ?');
            $stmt->execute([$staffId, $schoolId]);
            $staff = $stmt->fetch();
            if (!$staff) return ['success' => false, 'message' => 'Staff member not found'];

            // Use staff number as username if not provided
            if (!$username) $username = $staff['staff_number'];

            // Use staff email or generate placeholder
            $email = $staff['email'] ?: ($username . '@bcss.internal');

            // Check if user already exists for this staff
            $check = $pdo->prepare('SELECT id FROM users WHERE staff_id = ? AND school_id = ?');
            $check->execute([$staffId, $schoolId]);
            $existing = $check->fetch();

            $rolesJson = json_encode(array_values($roles));
            // '_keep_' means don't change the password
            if ($password === '_keep_' && $existing) {
                $keepPass = $pdo->prepare('SELECT password_hash FROM users WHERE id=?');
                $keepPass->execute([$existing['id']]);
                $hash = $keepPass->fetchColumn();
            } else {
                $hash = password_hash($password, PASSWORD_BCRYPT);
            }

            if ($existing) {
                // Update existing
                $pdo->prepare(
                    'UPDATE users SET password_hash=?, role=?, is_active=1 WHERE id=?'
                )->execute([$hash, $rolesJson, $existing['id']]);
                $userId = $existing['id'];
            } else {
                // Create new
                $pdo->prepare(
                    'INSERT INTO users (school_id, staff_id, email, password_hash, role, is_active)
                     VALUES (?,?,?,?,?,1)'
                )->execute([$schoolId, $staffId, $email, $hash, $rolesJson]);
                $userId = (int)$pdo->lastInsertId();
            }

            return [
                'success'  => true,
                'message'  => 'Login created successfully',
                'username' => $username,
                'password' => $password, // returned once so admin can give to staff
                'user_id'  => $userId,
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to create login', 'error' => $e->getMessage()];
        }
    }

    public static function getLogin(): array
    {
        try {
            Auth::check();
            $staffId  = isset($_GET['staff_id']) ? (int)$_GET['staff_id'] : 0;
            if (!$staffId) return ['success' => false, 'message' => 'staff_id required'];

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $stmt = $pdo->prepare(
                'SELECT u.id, u.email, u.role, u.is_active, s.staff_number
                 FROM users u
                 JOIN staff s ON s.id = u.staff_id
                 WHERE u.staff_id = ? AND u.school_id = ?'
            );
            $stmt->execute([$staffId, $schoolId]);
            $login = $stmt->fetch();

            return ['success' => true, 'login' => $login ?: null];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to get login'];
        }
    }
