<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/SchoolHelper.php';

class WorkloadController
{
    /**
     * GET /workload?academic_year_id=X
     * Returns all assignments grouped by staff member
     */
    public static function index(): array
    {
        try {
            Auth::check();
            $pdo            = getDatabaseConnection();
            $schoolId       = SchoolHelper::resolveSchoolId($pdo);
            $academicYearId = isset($_GET['academic_year_id']) ? (int)$_GET['academic_year_id'] : 0;

            if (!$academicYearId) {
                $academicYearId = SchoolHelper::resolveAcademicYearId($pdo, $schoolId);
            }

            $stmt = $pdo->prepare(
                'SELECT w.id, w.staff_id, w.subject_id, w.class_id, w.periods_per_week,
                        s.first_name, s.last_name, s.staff_number, s.role AS staff_role,
                        sub.name AS subject_name, sub.name_fr AS subject_name_fr,
                        sub.code AS subject_code, sub.coefficient,
                        c.name AS class_name, c.stream AS class_stream
                 FROM workload w
                 JOIN staff s   ON s.id   = w.staff_id
                 JOIN subjects sub ON sub.id = w.subject_id
                 JOIN classes c ON c.id   = w.class_id
                 WHERE w.school_id = ? AND w.academic_year_id = ?
                 ORDER BY s.last_name, s.first_name, c.name, sub.name'
            );
            $stmt->execute([$schoolId, $academicYearId]);
            $rows = $stmt->fetchAll();

            // Group by staff
            $byStaff = [];
            foreach ($rows as $row) {
                $sid = $row['staff_id'];
                if (!isset($byStaff[$sid])) {
                    $byStaff[$sid] = [
                        'staff_id'     => $sid,
                        'first_name'   => $row['first_name'],
                        'last_name'    => $row['last_name'],
                        'staff_number' => $row['staff_number'],
                        'staff_role'   => $row['staff_role'],
                        'assignments'  => [],
                        'total_periods'=> 0,
                    ];
                }
                $byStaff[$sid]['assignments'][] = [
                    'id'             => $row['id'],
                    'subject_id'     => $row['subject_id'],
                    'subject_name'   => $row['subject_name'],
                    'subject_name_fr'=> $row['subject_name_fr'],
                    'subject_code'   => $row['subject_code'],
                    'coefficient'    => $row['coefficient'],
                    'class_id'       => $row['class_id'],
                    'class_name'     => $row['class_name'],
                    'class_stream'   => $row['class_stream'],
                    'periods_per_week'=> (int)$row['periods_per_week'],
                ];
                $byStaff[$sid]['total_periods'] += (int)$row['periods_per_week'];
            }

            return [
                'success'        => true,
                'workload'       => array_values($byStaff),
                'academic_year_id' => $academicYearId,
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to load workload', 'error' => $e->getMessage()];
        }
    }

    /**
     * POST /workload
     * Assign a teacher to a subject+class
     */
    public static function assign(): array
    {
        try {
            Auth::check();
            $body           = json_decode(file_get_contents('php://input'), true) ?? [];
            $staffId        = (int)($body['staff_id']         ?? 0);
            $subjectId      = (int)($body['subject_id']       ?? 0);
            $classId        = (int)($body['class_id']         ?? 0);
            $academicYearId = (int)($body['academic_year_id'] ?? 0);
            $periods        = (int)($body['periods_per_week'] ?? 1);

            if (!$staffId || !$subjectId || !$classId || !$academicYearId) {
                return ['success' => false, 'message' => 'staff_id, subject_id, class_id and academic_year_id are required'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $stmt = $pdo->prepare(
                'INSERT INTO workload (school_id, staff_id, subject_id, class_id, academic_year_id, periods_per_week)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE periods_per_week = VALUES(periods_per_week)'
            );
            $stmt->execute([$schoolId, $staffId, $subjectId, $classId, $academicYearId, $periods]);

            return ['success' => true, 'message' => 'Assignment saved successfully'];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to save assignment', 'error' => $e->getMessage()];
        }
    }

    /**
     * DELETE /workload/:id
     */
    public static function remove(): array
    {
        try {
            Auth::check();
            $id  = isset($segments[1]) ? (int)$segments[1] : 0;
            // Parse from URL
            $parts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
            $id    = (int)end($parts);

            if (!$id) return ['success' => false, 'message' => 'Assignment ID required'];

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $stmt = $pdo->prepare('DELETE FROM workload WHERE id = ? AND school_id = ?');
            $stmt->execute([$id, $schoolId]);

            return ['success' => true, 'message' => 'Assignment removed'];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to remove assignment', 'error' => $e->getMessage()];
        }
    }

    /**
     * GET /workload/summary?academic_year_id=X&staff_id=Y
     * Per-teacher summary with annual hours
     */
    public static function summary(): array
    {
        try {
            Auth::check();
            $pdo            = getDatabaseConnection();
            $schoolId       = SchoolHelper::resolveSchoolId($pdo);
            $academicYearId = isset($_GET['academic_year_id']) ? (int)$_GET['academic_year_id'] : 0;
            $staffId        = isset($_GET['staff_id'])         ? (int)$_GET['staff_id']         : 0;

            if (!$academicYearId) {
                $academicYearId = SchoolHelper::resolveAcademicYearId($pdo, $schoolId);
            }

            $where  = 'w.school_id = ? AND w.academic_year_id = ?';
            $params = [$schoolId, $academicYearId];
            if ($staffId) { $where .= ' AND w.staff_id = ?'; $params[] = $staffId; }

            $stmt = $pdo->prepare(
                "SELECT s.id, s.first_name, s.last_name, s.staff_number, s.role AS staff_role,
                        COUNT(w.id)          AS total_assignments,
                        SUM(w.periods_per_week) AS total_periods_week,
                        SUM(w.periods_per_week) * 36 AS annual_periods,
                        GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') AS classes,
                        GROUP_CONCAT(DISTINCT sub.name ORDER BY sub.name SEPARATOR ', ') AS subjects
                 FROM workload w
                 JOIN staff s      ON s.id   = w.staff_id
                 JOIN subjects sub ON sub.id = w.subject_id
                 JOIN classes c    ON c.id   = w.class_id
                 WHERE $where
                 GROUP BY s.id
                 ORDER BY s.last_name, s.first_name"
            );
            $stmt->execute($params);

            return ['success' => true, 'summary' => $stmt->fetchAll()];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to load summary', 'error' => $e->getMessage()];
        }
    }
}
