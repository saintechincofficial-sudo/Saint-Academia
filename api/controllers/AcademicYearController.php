<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/SchoolHelper.php';

class AcademicYearController
{
    public static function index(): array
    {
        try {
            Auth::check();
            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $stmt = $pdo->prepare(
                'SELECT ay.*, 
                        (SELECT COUNT(*) FROM terms t WHERE t.academic_year_id = ay.id) AS term_count,
                        (SELECT COUNT(*) FROM classes c WHERE c.academic_year_id = ay.id AND c.school_id = ay.school_id) AS class_count
                 FROM academic_years ay
                 WHERE ay.school_id = ?
                 ORDER BY ay.start_date DESC'
            );
            $stmt->execute([$schoolId]);
            return ['success' => true, 'years' => $stmt->fetchAll()];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to load academic years', 'error' => $e->getMessage()];
        }
    }

    public static function create(): array
    {
        try {
            Auth::check();
            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);
            $body     = json_decode(file_get_contents('php://input'), true) ?? [];

            $label     = trim($body['label']      ?? '');
            $startDate = trim($body['start_date'] ?? '');
            $endDate   = trim($body['end_date']   ?? '');
            $isCurrent = (int)($body['is_current'] ?? 0);

            if (!$label || !$startDate || !$endDate) {
                return ['success' => false, 'message' => 'label, start_date and end_date are required'];
            }

            // Check duplicate label
            $check = $pdo->prepare('SELECT id FROM academic_years WHERE school_id = ? AND label = ?');
            $check->execute([$schoolId, $label]);
            if ($check->fetch()) return ['success' => false, 'message' => "Academic year '$label' already exists"];

            // Unset current if setting new one as current
            if ($isCurrent) {
                $pdo->prepare('UPDATE academic_years SET is_current = 0 WHERE school_id = ?')->execute([$schoolId]);
            }

            $stmt = $pdo->prepare(
                'INSERT INTO academic_years (school_id, label, start_date, end_date, is_current) VALUES (?,?,?,?,?)'
            );
            $stmt->execute([$schoolId, $label, $startDate, $endDate, $isCurrent]);
            $yearId = (int)$pdo->lastInsertId();

            // Auto-create 3 terms if requested
            if (!empty($body['create_terms'])) {
                $terms = [
                    [1, 'First Term',  $startDate,  date('Y-m-d', strtotime($startDate . ' +3 months'))],
                    [2, 'Second Term', date('Y-m-d', strtotime($startDate . ' +3 months +1 day')), date('Y-m-d', strtotime($startDate . ' +6 months'))],
                    [3, 'Third Term',  date('Y-m-d', strtotime($startDate . ' +6 months +1 day')), $endDate],
                ];
                $tStmt = $pdo->prepare('INSERT INTO terms (academic_year_id, term_number, label, start_date, end_date, is_current) VALUES (?,?,?,?,?,?)');
                foreach ($terms as $i => [$num, $label2, $ts, $te]) {
                    $tStmt->execute([$yearId, $num, $label2, $ts, $te, $i === 0 ? 1 : 0]);
                }
            }

            return ['success' => true, 'message' => 'Academic year created', 'year_id' => $yearId];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to create academic year', 'error' => $e->getMessage()];
        }
    }

    public static function setCurrent(): array
    {
        try {
            Auth::check();
            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);
            $yearId   = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$yearId) return ['success' => false, 'message' => 'Year ID required'];

            $pdo->prepare('UPDATE academic_years SET is_current = 0 WHERE school_id = ?')->execute([$schoolId]);
            $pdo->prepare('UPDATE academic_years SET is_current = 1 WHERE id = ? AND school_id = ?')->execute([$yearId, $schoolId]);

            return ['success' => true, 'message' => 'Current year updated'];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to update current year'];
        }
    }
}
