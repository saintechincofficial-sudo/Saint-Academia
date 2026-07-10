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
    public static function listCatalog(): array
    {
        try {
            Auth::check();
            $pdo = getDatabaseConnection();
            $stmt = $pdo->query('SELECT * FROM academic_year_catalog ORDER BY default_start_date DESC');
            return ['success' => true, 'catalog' => $stmt->fetchAll()];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to load catalog', 'error' => $e->getMessage()];
        }
    }
    public static function createCatalogYear(): array
    {
        try {
            Auth::hasRole('super_admin');
            $pdo  = getDatabaseConnection();
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            $label     = trim($body['label'] ?? '');
            $type      = trim($body['applicable_type'] ?? 'both');
            $startDate = trim($body['default_start_date'] ?? '');
            $endDate   = trim($body['default_end_date'] ?? '');
            if (!$label || !$startDate || !$endDate) {
                return ['success' => false, 'message' => 'label, default_start_date and default_end_date are required'];
            }
            if (!in_array($type, ['secondary','higher_ed','both'])) $type = 'both';
            $check = $pdo->prepare('SELECT id FROM academic_year_catalog WHERE label = ?');
            $check->execute([$label]);
            if ($check->fetch()) return ['success' => false, 'message' => "Catalog year '$label' already exists"];
            $stmt = $pdo->prepare(
                'INSERT INTO academic_year_catalog (label, applicable_type, default_start_date, default_end_date) VALUES (?,?,?,?)'
            );
            $stmt->execute([$label, $type, $startDate, $endDate]);
            return ['success' => true, 'message' => 'Catalog year created', 'catalog_id' => (int)$pdo->lastInsertId()];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to create catalog year', 'error' => $e->getMessage()];
        }
    }
    public static function adopt(): array
    {
        try {
            Auth::hasRole(['super_admin','school_admin']);
            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);
            $body     = json_decode(file_get_contents('php://input'), true) ?? [];
            $catalogId = (int)($body['catalog_year_id'] ?? 0);
            if (!$catalogId) return ['success' => false, 'message' => 'catalog_year_id is required'];
            $cStmt = $pdo->prepare('SELECT * FROM academic_year_catalog WHERE id = ?');
            $cStmt->execute([$catalogId]);
            $catalog = $cStmt->fetch();
            if (!$catalog) return ['success' => false, 'message' => 'Catalog year not found'];
            $sStmt = $pdo->prepare('SELECT institution_type FROM schools WHERE id = ?');
            $sStmt->execute([$schoolId]);
            $school = $sStmt->fetch();
            $instType = $school['institution_type'] ?? 'secondary';
            if ($catalog['applicable_type'] !== 'both' && $catalog['applicable_type'] !== $instType) {
                return ['success' => false, 'message' => 'This catalog year is not applicable to your institution type'];
            }
            $label     = $catalog['label'];
            $startDate = trim($body['start_date'] ?? $catalog['default_start_date']);
            $endDate   = trim($body['end_date'] ?? $catalog['default_end_date']);
            $isCurrent = (int)($body['is_current'] ?? 0);
            $check = $pdo->prepare('SELECT id FROM academic_years WHERE school_id = ? AND label = ?');
            $check->execute([$schoolId, $label]);
            if ($check->fetch()) return ['success' => false, 'message' => "Academic year '$label' already exists for this school"];
            if ($isCurrent) {
                $pdo->prepare('UPDATE academic_years SET is_current = 0 WHERE school_id = ?')->execute([$schoolId]);
            }
            $stmt = $pdo->prepare(
                'INSERT INTO academic_years (school_id, catalog_year_id, label, start_date, end_date, is_current) VALUES (?,?,?,?,?,?)'
            );
            $stmt->execute([$schoolId, $catalogId, $label, $startDate, $endDate, $isCurrent]);
            $yearId = (int)$pdo->lastInsertId();
            if ($instType === 'higher_ed') {
                $semesters = [
                    [1, 'Semester 1', $startDate, date('Y-m-d', strtotime($startDate . ' +5 months'))],
                    [2, 'Semester 2', date('Y-m-d', strtotime($startDate . ' +5 months +1 day')), $endDate],
                ];
                $semStmt = $pdo->prepare('INSERT INTO semesters (academic_year_id, semester_number, label, start_date, end_date, is_current) VALUES (?,?,?,?,?,?)');
                $resitStmt = $pdo->prepare('INSERT INTO resit_periods (semester_id, label, start_date, end_date) VALUES (?,?,?,?)');
                foreach ($semesters as $i => [$num, $slabel, $ss, $se]) {
                    $semStmt->execute([$yearId, $num, $slabel, $ss, $se, $i === 0 ? 1 : 0]);
                    $semId = (int)$pdo->lastInsertId();
                    $resitStart = date('Y-m-d', strtotime($se . ' +7 days'));
                    $resitEnd   = date('Y-m-d', strtotime($se . ' +21 days'));
                    $resitStmt->execute([$semId, 'Resit - ' . $slabel, $resitStart, $resitEnd]);
                }
            } else {
                $terms = [
                    [1, 'First Term',  $startDate, date('Y-m-d', strtotime($startDate . ' +3 months'))],
                    [2, 'Second Term', date('Y-m-d', strtotime($startDate . ' +3 months +1 day')), date('Y-m-d', strtotime($startDate . ' +6 months'))],
                    [3, 'Third Term',  date('Y-m-d', strtotime($startDate . ' +6 months +1 day')), $endDate],
                ];
                $tStmt = $pdo->prepare('INSERT INTO terms (academic_year_id, term_number, label, start_date, end_date, is_current) VALUES (?,?,?,?,?,?)');
                foreach ($terms as $i => [$num, $tlabel, $ts, $te]) {
                    $tStmt->execute([$yearId, $num, $tlabel, $ts, $te, $i === 0 ? 1 : 0]);
                }
            }
            return ['success' => true, 'message' => 'Academic year adopted', 'year_id' => $yearId, 'institution_type' => $instType];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to adopt academic year', 'error' => $e->getMessage()];
        }
    }
}
