<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/TenantContext.php';

class SchoolController
{
    // All fields the school profile returns
    private static $SELECT = 'id, name, name_fr, address, phone, email,
        logo_path, letterhead_path, motto, region, delegation,
        po_box, is_active, created_at';

    // Parse multipart body for PUT (PHP doesn't do this natively)
    private static function parseMultipartPut(): array
    {
        $body = [];
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

        if (strpos($contentType, 'multipart/form-data') !== false) {
            // Extract boundary
            preg_match('/boundary=(.+)/', $contentType, $m);
            if (!isset($m[1])) return $body;
            $boundary = $m[1];
            $raw = file_get_contents('php://input');
            $parts = array_slice(explode("--$boundary", $raw), 1, -1);

            foreach ($parts as $part) {
                if (strpos($part, 'filename=') !== false) continue; // skip files
                if (!preg_match('/name="([^"]+)"/', $part, $nm)) continue;
                $value = trim(preg_replace('/^[\r\n]+/', '', substr($part, strpos($part, "\r\n\r\n") + 4)));
                $value = rtrim($value);
                $body[$nm[1]] = $value;
            }

            // Parse file parts into $_FILES-like structure
            foreach ($parts as $part) {
                if (strpos($part, 'filename=') === false) continue;
                if (!preg_match('/name="([^"]+)".*filename="([^"]+)"/s', $part, $fm)) continue;
                $fieldName  = $fm[1];
                $fileName   = $fm[2];
                if (!$fileName) continue;

                // Extract content-type
                $ct = 'application/octet-stream';
                if (preg_match('/Content-Type:\s*(.+)/i', $part, $ctm)) {
                    $ct = trim($ctm[1]);
                }

                $fileData = substr($part, strpos($part, "\r\n\r\n") + 4);
                $fileData = rtrim($fileData, "\r\n");

                // Write to temp file
                $tmp = tempnam(sys_get_temp_dir(), 'upload_');
                file_put_contents($tmp, $fileData);

                $_FILES[$fieldName] = [
                    'name'     => $fileName,
                    'type'     => $ct,
                    'tmp_name' => $tmp,
                    'error'    => UPLOAD_ERR_OK,
                    'size'     => strlen($fileData),
                ];
            }
        } else {
            // JSON body
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
        }

        return $body;
    }

    private static function saveUploadedFile(string $fieldName, int $schoolId): ?string
    {
        if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] !== UPLOAD_ERR_OK) {
            return null;
        }

        $file     = $_FILES[$fieldName];
        $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed  = ['jpg','jpeg','png','gif','webp','pdf'];

        if (!in_array($ext, $allowed)) return null;

        $uploadDir = __DIR__ . '/../../uploads/schools/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = $fieldName . '_' . $schoolId . '_' . time() . '.' . $ext;
        $dest     = $uploadDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $dest) || rename($file['tmp_name'], $dest)) {
            return '/uploads/schools/' . $filename;
        }
        return null;
    }

    public static function current(): array
    {
        try {
            Auth::check();
            $schoolId = TenantContext::requireSchoolId();

            $pdo  = getDatabaseConnection();
            $stmt = $pdo->prepare('SELECT ' . self::$SELECT . ' FROM schools WHERE id = ?');
            $stmt->execute([$schoolId]);
            $school = $stmt->fetch();

            if (!$school) return ['success' => false, 'message' => 'School not found'];

            return ['success' => true, 'school' => $school];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch school', 'error' => $e->getMessage()];
        }
    }

    public static function update(): array
    {
        try {
            Auth::check();
            $schoolId = TenantContext::requireSchoolId();

            // Parse body (handles both JSON and multipart PUT)
            $body = self::parseMultipartPut();
            if (empty($body)) $body = $_POST ?? [];

            $name = trim($body['name'] ?? '');
            if (empty($name)) return ['success' => false, 'message' => 'School name is required'];

            $pdo = getDatabaseConnection();

            // Handle file uploads
            $logoPatch       = self::saveUploadedFile('logo',       $schoolId);
            $letterheadPatch = self::saveUploadedFile('letterhead', $schoolId);

            // Build update query
            $fields = [
                'name = ?',  'name_fr = ?', 'address = ?', 'phone = ?',
                'email = ?', 'motto = ?',   'region = ?',  'delegation = ?', 'po_box = ?',
            ];
            $params = [
                $name,
                trim($body['name_fr']    ?? ''),
                trim($body['address']    ?? ''),
                trim($body['phone']      ?? ''),
                trim($body['email']      ?? ''),
                trim($body['motto']      ?? ''),
                trim($body['region']     ?? ''),
                trim($body['delegation'] ?? ''),
                trim($body['po_box']     ?? ''),
            ];

            if ($logoPatch !== null) {
                $fields[] = 'logo_path = ?';
                $params[] = $logoPatch;
            }
            if ($letterheadPatch !== null) {
                $fields[] = 'letterhead_path = ?';
                $params[] = $letterheadPatch;
            }

            $params[] = $schoolId;
            $sql = 'UPDATE schools SET ' . implode(', ', $fields) . ' WHERE id = ?';
            $pdo->prepare($sql)->execute($params);

            // Return updated record
            $stmt = $pdo->prepare('SELECT ' . self::$SELECT . ' FROM schools WHERE id = ?');
            $stmt->execute([$schoolId]);
            $school = $stmt->fetch();

            return ['success' => true, 'message' => 'School profile updated successfully', 'school' => $school];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to update school', 'error' => $e->getMessage()];
        }
    }

    public static function index(): array
    {
        try {
            Auth::check();
            if (!TenantContext::isSuperAdmin()) {
                return ['success' => false, 'message' => 'Forbidden'];
            }
            $pdo  = getDatabaseConnection();
            $stmt = $pdo->prepare('SELECT ' . self::$SELECT . ' FROM schools ORDER BY id DESC');
            $stmt->execute();
            return ['success' => true, 'schools' => $stmt->fetchAll()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch schools'];
        }
    }

    public static function create(): array
    {
        try {
            Auth::check();
            if (!TenantContext::isSuperAdmin()) {
                return ['success' => false, 'message' => 'Forbidden'];
            }
            $body          = json_decode(file_get_contents('php://input'), true) ?? [];
            $name          = trim($body['name']           ?? '');
            $adminEmail    = trim($body['admin_email']    ?? '');
            $adminPassword = trim($body['admin_password'] ?? '');

            if (!$name)          return ['success' => false, 'message' => 'School name is required'];
            if (!$adminEmail)    return ['success' => false, 'message' => 'Admin email is required'];
            if (!$adminPassword) return ['success' => false, 'message' => 'Admin password is required'];

            $pdo = getDatabaseConnection();
            $pdo->beginTransaction();

            $stmt = $pdo->prepare(
                'INSERT INTO schools (name, name_fr, address, phone, email, is_active) VALUES (?,?,?,?,?,1)'
            );
            $stmt->execute([$name, $body['name_fr']??'', $body['address']??'', $body['phone']??'', $body['email']??'']);
            $schoolId = (int) $pdo->lastInsertId();

            $pdo->prepare(
                'INSERT INTO users (school_id, email, password_hash, role, is_active) VALUES (?,?,?,?,1)'
            )->execute([$schoolId, $adminEmail, password_hash($adminPassword, PASSWORD_BCRYPT), 'school_admin']);

            $pdo->commit();

            return ['success' => true, 'message' => 'School created successfully', 'school_id' => $schoolId];
        } catch (Exception $e) {
            if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
            return ['success' => false, 'message' => 'Failed to create school', 'error' => $e->getMessage()];
        }
    }
}
