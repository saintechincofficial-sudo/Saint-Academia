<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/SchoolHelper.php';

class EnrollmentController
{
    public static function index(): array
    {
        try {
            Auth::check();
            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $classId        = isset($_GET['class_id'])         ? (int) $_GET['class_id']         : null;
            $academicYearId = isset($_GET['academic_year_id']) ? (int) $_GET['academic_year_id'] : null;

            if (!$classId) {
                return ['success' => false, 'message' => 'class_id is required'];
            }
            if (!$academicYearId) {
                $academicYearId = SchoolHelper::resolveAcademicYearId($pdo, $schoolId);
            }

            $stmt = $pdo->prepare(
                'SELECT
                     se.id,
                     se.status,
                     se.enrolled_at,
                     s.id          AS student_id,
                     s.first_name,
                     s.last_name,
                     s.student_number,
                     s.gender,
                     c.name        AS class_name,
                     ay.label      AS academic_year
                 FROM student_enrollments se
                 JOIN students       s  ON s.id  = se.student_id
                 JOIN classes        c  ON c.id  = se.class_id
                 JOIN academic_years ay ON ay.id = se.academic_year_id
                 WHERE se.school_id        = ?
                   AND se.class_id         = ?
                   AND se.academic_year_id = ?
                 ORDER BY s.last_name, s.first_name'
            );
            $stmt->execute([$schoolId, $classId, $academicYearId]);

            return ['success' => true, 'enrollments' => $stmt->fetchAll()];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Unable to load enrollments', 'error' => $e->getMessage()];
        }
    }

    public static function enroll(): array
    {
        try {
            Auth::check();

            $body           = json_decode(file_get_contents('php://input'), true) ?? [];
            $studentIds     = $body['student_ids']       ?? [];
            $classId        = (int) ($body['class_id']        ?? 0);
            $academicYearId = (int) ($body['academic_year_id'] ?? 0);

            if (empty($studentIds) || $classId <= 0) {
                return ['success' => false, 'message' => 'student_ids array and class_id are required'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            if (!$academicYearId) {
                $academicYearId = SchoolHelper::resolveAcademicYearId($pdo, $schoolId);
            }

            $stmt = $pdo->prepare(
                'INSERT INTO student_enrollments
                 (school_id, student_id, class_id, academic_year_id, status)
                 VALUES (?, ?, ?, ?, \'active\')
                 ON DUPLICATE KEY UPDATE status = \'active\''
            );

            $enrolled = 0;
            foreach ($studentIds as $studentId) {
                $studentId = (int) $studentId;
                if ($studentId <= 0) continue;
                $stmt->execute([$schoolId, $studentId, $classId, $academicYearId]);
                $enrolled++;
            }

            return ['success' => true, 'message' => "{$enrolled} student(s) enrolled successfully"];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Unable to enroll students', 'error' => $e->getMessage()];
        }
    }

    public static function unenroll(): array
    {
        try {
            Auth::check();

            $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Enrollment ID is required'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $stmt = $pdo->prepare(
                'UPDATE student_enrollments SET status = \'withdrawn\'
                 WHERE id = ? AND school_id = ?'
            );
            $stmt->execute([$id, $schoolId]);

            return ['success' => true, 'message' => 'Student removed from class'];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Unable to unenroll student', 'error' => $e->getMessage()];
        }
    }

    public static function unenrolledStudents(): array
    {
        try {
            Auth::check();
            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $classId        = isset($_GET['class_id'])         ? (int) $_GET['class_id']         : null;
            $academicYearId = isset($_GET['academic_year_id']) ? (int) $_GET['academic_year_id'] : null;

            if (!$classId) {
                return ['success' => false, 'message' => 'class_id is required'];
            }
            if (!$academicYearId) {
                $academicYearId = SchoolHelper::resolveAcademicYearId($pdo, $schoolId);
            }

            $stmt = $pdo->prepare(
                'SELECT id, first_name, last_name, student_number, gender
                 FROM students
                 WHERE school_id = ?
                   AND status = \'active\'
                   AND id NOT IN (
                       SELECT student_id FROM student_enrollments
                       WHERE school_id = ? AND class_id = ?
                         AND academic_year_id = ? AND status = \'active\'
                   )
                 ORDER BY last_name, first_name'
            );
            $stmt->execute([$schoolId, $schoolId, $classId, $academicYearId]);

            return ['success' => true, 'students' => $stmt->fetchAll()];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Unable to load unenrolled students', 'error' => $e->getMessage()];
        }
    }
}
