<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/TenantContext.php';
require_once __DIR__ . '/../utils/SchoolHelper.php';

class SchoolController
{
    private static $selectFields =
        'id, name, name_fr, address, phone, email, is_active, created_at,
         logo_path, letterhead_path, motto, po_box, region, delegation';

    public static function index(): array
    {
        try {
            Auth::check();
            if (!TenantContext::isSuperAdmin()) {
                return ['success' => false, 'message' => 'Forbidden'];
            }
            $pdo  = getDatabaseConnection();
            $stmt = $pdo->prepare(
                'SELECT ' . self::$selectFields . ' FROM schools ORDER BY id DESC'
            );
            $stmt->execute();
            return ['success' => true, 'schools' => $stmt->fetchAll()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch schools'];
        }
    }

    public static function current(): array
    {
        try {
            Auth::check();
            $schoolId = TenantContext::requireSchoolId();
            $pdo      = getDatabaseConnection();
            $stmt     = $pdo->prepare(
                'SELECT ' . self::$selectFields . ' FROM schools WHERE id = ?'
            );
            $stmt->execute([$schoolId]);
            $school = $stmt->fetch();
            if (!$school) return ['success' => false, 'message' => 'School not found'];
            return ['success' => true, 'school' => $school];
        } catch (Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public static function show(): array
    {
        try {
            Auth::check();
            if (!TenantContext::isSuperAdmin()) {
                return ['success' => false, 'message' => 'Forbidden'];
            }
            $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
            if (!$id) return ['success' => false, 'message' => 'School ID required'];
            $pdo  = getDatabaseConnection();
            $stmt = $pdo->prepare(
                'SELECT ' . self::$selectFields . ' FROM schools WHERE id = ?'
            );
            $stmt->execute([$id]);
            $school = $stmt->fetch();
            if (!$school) return ['success' => false, 'message' => 'School not found'];
            return ['success' => true, 'school' => $school];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch school'];
        }
    }

    public static function update(): array
    {
        try {
            Auth::check();
            $isSuperAdmin = TenantContext::isSuperAdmin();
            $schoolId     = (isset($_GET['id']) && $isSuperAdmin)
                ? (int) $_GET['id']
                : TenantContext::requireSchoolId();

            if (!$schoolId) return ['success' => false, 'message' => 'School ID required'];

            // Detect content type and parse body accordingly
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (str_contains($contentType, 'application/json')) {
                // JSON request
                $body = json_decode(file_get_contents('php://input'), true) ?: [];
            } elseif (str_contains($contentType, 'multipart/form-data')) {
                // For PUT requests with multipart/form-data, PHP doesn't auto-populate $_POST
                // We need to manually parse if $_POST is empty
                if (empty($_POST)) {
                    $body = self::parseMultipartFormData($contentType);
                } else {
                    $body = $_POST ?: [];
                }
            } else {
                // Fallback: try $_POST
                $body = $_POST ?: [];
            }

            // Ensure we have a name field
            $name = trim($body['name'] ?? '');
            if (empty($name)) {
                return ['success' => false, 'message' => 'School name is required'];
            }

            $email = trim($body['email'] ?? '');
            if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return ['success' => false, 'message' => 'Invalid email address'];
            }

            $pdo = getDatabaseConnection();

            // Handle logo upload
            $logoPath = null;
            if (!empty($_FILES['logo']['tmp_name'])) {
                $logoPath = self::uploadFile($_FILES['logo'], $schoolId, 'logo');
                if (!$logoPath) return ['success' => false, 'message' => 'Logo upload failed. Use JPG or PNG under 2MB.'];
            }

            // Handle letterhead upload
            $letterheadPath = null;
            if (!empty($_FILES['letterhead']['tmp_name'])) {
                $letterheadPath = self::uploadFile($_FILES['letterhead'], $schoolId, 'letterhead');
                if (!$letterheadPath) return ['success' => false, 'message' => 'Letterhead upload failed. Use JPG or PNG under 5MB.'];
            }

            $fields = [
                'name = ?', 'name_fr = ?', 'address = ?', 'phone = ?',
                'email = ?', 'motto = ?', 'po_box = ?', 'region = ?', 'delegation = ?'
            ];
            $params = [
                $name,
                trim($body['name_fr']    ?? ''),
                trim($body['address']    ?? ''),
                trim($body['phone']      ?? ''),
                $email,
                trim($body['motto']      ?? ''),
                trim($body['po_box']     ?? ''),
                trim($body['region']     ?? ''),
                trim($body['delegation'] ?? ''),
            ];

            if ($logoPath) {
                $fields[] = 'logo_path = ?';
                $params[] = $logoPath;
            }
            if ($letterheadPath) {
                $fields[] = 'letterhead_path = ?';
                $params[] = $letterheadPath;
            }

            $isActive = isset($body['is_active']) ? (bool) $body['is_active'] : null;
            if ($isActive !== null) {
                $fields[] = 'is_active = ?';
                $params[] = $isActive ? 1 : 0;
            }

            $params[] = $schoolId;
            $sql = 'UPDATE schools SET ' . implode(', ', $fields) . ' WHERE id = ?';
            $pdo->prepare($sql)->execute($params);

            $stmt = $pdo->prepare('SELECT ' . self::$selectFields . ' FROM schools WHERE id = ?');
            $stmt->execute([$schoolId]);
            $school = $stmt->fetch();

            return ['success' => true, 'message' => 'School updated successfully', 'school' => $school];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to update school', 'error' => $e->getMessage()];
        }
    }

    private static function uploadFile(array $file, int $schoolId, string $type): ?string
    {
        $allowed   = ['image/jpeg', 'image/png', 'image/gif'];
        $maxSize   = $type === 'letterhead' ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
        $mimeType  = mime_content_type($file['tmp_name']);

        if (!in_array($mimeType, $allowed)) return null;
        if ($file['size'] > $maxSize)       return null;

        $ext      = $mimeType === 'image/png' ? 'png' : 'jpg';
        $dir      = __DIR__ . '/../../public/uploads/schools/' . $schoolId . '/';
        $filename = $type . '_' . time() . '.' . $ext;

        if (!is_dir($dir)) mkdir($dir, 0755, true);

        if (!move_uploaded_file($file['tmp_name'], $dir . $filename)) return null;

        return '/uploads/schools/' . $schoolId . '/' . $filename;
    }

    public static function create(): array
    {
        try {
            Auth::check();
            if (!TenantContext::isSuperAdmin()) {
                return ['success' => false, 'message' => 'Forbidden'];
            }

            $body          = json_decode(file_get_contents('php://input'), true) ?: [];
            $name          = trim($body['name']           ?? '');
            $email         = trim($body['email']          ?? '');
            $adminEmail    = trim($body['admin_email']    ?? '');
            $adminPassword = trim($body['admin_password'] ?? '');

            if (empty($name))          return ['success' => false, 'message' => 'School name is required'];
            if (empty($adminEmail))    return ['success' => false, 'message' => 'Admin email is required'];
            if (empty($adminPassword)) return ['success' => false, 'message' => 'Admin password is required'];
            if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
                return ['success' => false, 'message' => 'Admin email is invalid'];
            }

            $pdo = getDatabaseConnection();
            $pdo->beginTransaction();

            $stmt = $pdo->prepare(
                'INSERT INTO schools (name, name_fr, address, phone, email, is_active)
                 VALUES (?, ?, ?, ?, ?, 1)'
            );
            $stmt->execute([
                $name,
                trim($body['name_fr'] ?? ''),
                trim($body['address'] ?? ''),
                trim($body['phone']   ?? ''),
                $email,
            ]);
            $schoolId = (int) $pdo->lastInsertId();

            $hash = password_hash($adminPassword, PASSWORD_BCRYPT);
            $pdo->prepare(
                'INSERT INTO users (school_id, email, password_hash, role, is_active)
                 VALUES (?, ?, ?, \'school_admin\', 1)'
            )->execute([$schoolId, $adminEmail, $hash]);

            $pdo->commit();

            return ['success' => true, 'message' => 'School created successfully',
                    'school' => ['id' => $schoolId, 'name' => $name, 'email' => $email]];
        } catch (Exception $e) {
            if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
            return ['success' => false, 'message' => 'Failed to create school', 'error' => $e->getMessage()];
        }
    }

    /**
     * Parse multipart/form-data from php://input stream
     * This is needed for PUT requests where PHP doesn't auto-populate $_POST and $_FILES
     */
    private static function parseMultipartFormData(string $contentType): array
    {
        $result = [];
        
        // Extract boundary from Content-Type header
        if (!preg_match('/boundary=([^;\s]+)/', $contentType, $matches)) {
            return [];
        }
        
        $boundary = trim($matches[1], '"');
        $data = file_get_contents('php://input');
        
        // Split by boundary
        $parts = explode('--' . $boundary, $data);
        
        foreach ($parts as $part) {
            if (empty(trim($part)) || $part === '--') continue;
            
            // Split headers from content
            if (!strpos($part, "\r\n\r\n")) continue;
            
            [$headerSection, $contentSection] = explode("\r\n\r\n", $part, 2);
            $contentSection = rtrim($contentSection, "\r\n--");
            
            // Parse headers
            if (!preg_match('/name="([^"]+)"/', $headerSection, $nameMatches)) {
                continue;
            }
            
            $fieldName = $nameMatches[1];
            
            // Check if this is a file upload (has filename parameter)
            if (preg_match('/filename="([^"]*)"/', $headerSection, $filenameMatches)) {
                // Extract MIME type from headers
                $mimeType = 'application/octet-stream';
                if (preg_match('/Content-Type:\s*([^\r\n]+)/', $headerSection, $mimeMatches)) {
                    $mimeType = trim($mimeMatches[1]);
                }
                
                // Store file data temporarily for processing
                if (!isset($_FILES)) $_FILES = [];
                $_FILES[$fieldName] = [
                    'name' => $filenameMatches[1],
                    'type' => $mimeType,
                    'tmp_name' => self::saveMultipartFileTmp($contentSection),
                    'error' => 0,
                    'size' => strlen($contentSection)
                ];
            } else {
                // Regular form field
                $result[$fieldName] = $contentSection;
            }
        }
        
        return $result;
    }
    
    /**
     * Save multipart file content to a temporary location
     */
    private static function saveMultipartFileTmp(string $content): string
    {
        $tmpFile = sys_get_temp_dir() . '/' . uniqid('multipart_') . '.tmp';
        file_put_contents($tmpFile, $content);
        return $tmpFile;
    }
}

