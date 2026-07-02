<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/TenantContext.php';
require_once __DIR__ . '/../utils/SchoolHelper.php';

class AttendanceController
{
    public static function index(): array
    {
        try {
            Auth::check();
            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $stmt = $pdo->prepare(
                'SELECT
                     a.id,
                     s2.session_date,
                     c.name  AS class_name,
                     s.first_name,
                     s.last_name,
                     a.status
                 FROM attendance_records   a
                 JOIN attendance_sessions  s2 ON s2.id = a.session_id
                 JOIN students             s  ON s.id  = a.student_id
                 JOIN classes              c  ON c.id  = s2.class_id
                 WHERE s2.school_id = ?
                 ORDER BY s2.session_date DESC, a.id DESC
                 LIMIT 200'
            );
            $stmt->execute([$schoolId]);

            return [
                'success'    => true,
                'attendance' => $stmt->fetchAll(),
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to load attendance',
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

            $studentId   = (int)   ($body['student_id']    ?? 0);
            $classId     = (int)   ($body['class_id']      ?? 0);
            $status      = trim((string) ($body['status']  ?? 'present'));
            $sessionDate = trim((string) ($body['session_date'] ?? date('Y-m-d')));

            if ($studentId <= 0 || $classId <= 0) {
                return ['success' => false, 'message' => 'Student ID and class ID are required'];
            }

            $allowed = ['present', 'absent', 'late', 'excused'];
            if (!in_array($status, $allowed, true)) {
                return ['success' => false, 'message' => 'Invalid status. Allowed: ' . implode(', ', $allowed)];
            }

            if (!strtotime($sessionDate)) {
                return ['success' => false, 'message' => 'Invalid session date format'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $sessionStmt = $pdo->prepare(
                'SELECT id FROM attendance_sessions
                 WHERE school_id = ? AND class_id = ? AND session_date = ?
                 LIMIT 1'
            );
            $sessionStmt->execute([$schoolId, $classId, $sessionDate]);
            $existingSession = $sessionStmt->fetch();

            if ($existingSession) {
                $sessionId = (int) $existingSession['id'];
            } else {
                $currentUser = TenantContext::currentUser();
                $createdBy   = $currentUser ? (int) $currentUser->user_id : null;

                $insertSession = $pdo->prepare(
                    'INSERT INTO attendance_sessions
                     (school_id, class_id, session_date, created_by, created_at)
                     VALUES (?, ?, ?, ?, NOW())'
                );
                $insertSession->execute([$schoolId, $classId, $sessionDate, $createdBy]);
                $sessionId = (int) $pdo->lastInsertId();
            }

            $upsert = $pdo->prepare(
                'INSERT INTO attendance_records (session_id, student_id, status, marked_at)
                 VALUES (?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE status = VALUES(status), marked_at = NOW()'
            );
            $upsert->execute([$sessionId, $studentId, $status]);

            return [
                'success'    => true,
                'message'    => 'Attendance recorded',
                'attendance' => [
                    'student_id'   => $studentId,
                    'class_id'     => $classId,
                    'status'       => $status,
                    'session_date' => $sessionDate,
                ],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to record attendance',
                'error'   => $e->getMessage(),
            ];
        }
    }
}
