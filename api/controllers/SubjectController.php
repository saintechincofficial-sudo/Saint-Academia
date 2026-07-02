<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/SchoolHelper.php';

class SubjectController
{
    public static function index(): array
    {
        try {
            Auth::check();
            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $stmt = $pdo->prepare(
                'SELECT id, name, name_fr, code, coefficient
                 FROM subjects
                 WHERE school_id = ?
                 ORDER BY name ASC'
            );
            $stmt->execute([$schoolId]);

            return ['success' => true, 'subjects' => $stmt->fetchAll()];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to load subjects',
                'error'   => $e->getMessage(),
            ];
        }
    }

    public static function create(): array
    {
        try {
            Auth::check();

            $body = json_decode(file_get_contents('php://input'), true);
            if (!is_array($body) || empty($body)) {
                $body = $_POST ?: [];
            }

            $name        = trim((string) ($body['name']        ?? ''));
            $nameFr      = trim((string) ($body['name_fr']     ?? ''));
            $code        = strtoupper(trim((string) ($body['code'] ?? '')));
            $coefficient = isset($body['coefficient']) ? (int) $body['coefficient'] : 1;

            if ($name === '') {
                return ['success' => false, 'message' => 'Subject name is required'];
            }
            if ($coefficient < 1 || $coefficient > 10) {
                return ['success' => false, 'message' => 'Coefficient must be between 1 and 10'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            if ($code !== '') {
                $dupCheck = $pdo->prepare(
                    'SELECT id FROM subjects WHERE school_id = ? AND code = ? LIMIT 1'
                );
                $dupCheck->execute([$schoolId, $code]);
                if ($dupCheck->fetch()) {
                    return ['success' => false, 'message' => "Subject code '{$code}' already exists"];
                }
            }

            $stmt = $pdo->prepare(
                'INSERT INTO subjects (school_id, name, name_fr, code, coefficient)
                 VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([$schoolId, $name, $nameFr, $code, $coefficient]);

            return [
                'success' => true,
                'message' => 'Subject created',
                'subject' => [
                    'id'          => (int) $pdo->lastInsertId(),
                    'name'        => $name,
                    'name_fr'     => $nameFr,
                    'code'        => $code,
                    'coefficient' => $coefficient,
                ],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to create subject',
                'error'   => $e->getMessage(),
            ];
        }
    }

    public static function update(): array
    {
        try {
            Auth::check();

            $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Subject ID is required'];
            }

            $body = json_decode(file_get_contents('php://input'), true);
            if (!is_array($body) || empty($body)) {
                $body = $_POST ?: [];
            }

            $name        = trim((string) ($body['name']        ?? ''));
            $nameFr      = trim((string) ($body['name_fr']     ?? ''));
            $code        = strtoupper(trim((string) ($body['code'] ?? '')));
            $coefficient = isset($body['coefficient']) ? (int) $body['coefficient'] : 1;

            if ($name === '') {
                return ['success' => false, 'message' => 'Subject name is required'];
            }
            if ($coefficient < 1 || $coefficient > 10) {
                return ['success' => false, 'message' => 'Coefficient must be between 1 and 10'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $existing = $pdo->prepare('SELECT id FROM subjects WHERE id = ? AND school_id = ?');
            $existing->execute([$id, $schoolId]);
            if (!$existing->fetch()) {
                return ['success' => false, 'message' => 'Subject not found'];
            }

            $stmt = $pdo->prepare(
                'UPDATE subjects SET name = ?, name_fr = ?, code = ?, coefficient = ?
                 WHERE id = ? AND school_id = ?'
            );
            $stmt->execute([$name, $nameFr, $code, $coefficient, $id, $schoolId]);

            return ['success' => true, 'message' => 'Subject updated'];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to update subject',
                'error'   => $e->getMessage(),
            ];
        }
    }

    public static function delete(): array
    {
        try {
            Auth::check();

            $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Subject ID is required'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $existing = $pdo->prepare('SELECT id FROM subjects WHERE id = ? AND school_id = ?');
            $existing->execute([$id, $schoolId]);
            if (!$existing->fetch()) {
                return ['success' => false, 'message' => 'Subject not found'];
            }

            $stmt = $pdo->prepare('DELETE FROM subjects WHERE id = ? AND school_id = ?');
            $stmt->execute([$id, $schoolId]);

            return ['success' => true, 'message' => 'Subject deleted'];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to delete subject',
                'error'   => $e->getMessage(),
            ];
        }
    }
}
