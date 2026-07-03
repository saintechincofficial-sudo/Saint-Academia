<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/SchoolHelper.php';
require_once __DIR__ . '/../utils/TenantContext.php';

class PromotionController
{
    public static function preview(): array
    {
        try {
            Auth::check();

            $classId        = isset($_GET['class_id'])         ? (int) $_GET['class_id']         : 0;
            $academicYearId = isset($_GET['academic_year_id']) ? (int) $_GET['academic_year_id'] : 0;

            if ($classId <= 0) {
                return ['success' => false, 'message' => 'class_id is required'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            if (!$academicYearId) {
                $academicYearId = SchoolHelper::resolveAcademicYearId($pdo, $schoolId);
            }

            $classStmt = $pdo->prepare('SELECT name, stream FROM classes WHERE id = ? AND school_id = ?');
            $classStmt->execute([$classId, $schoolId]);
            $class = $classStmt->fetch();
            if (!$class) return ['success' => false, 'message' => 'Class not found'];

            $yearStmt = $pdo->prepare('SELECT label FROM academic_years WHERE id = ? AND school_id = ?');
            $yearStmt->execute([$academicYearId, $schoolId]);
            $year = $yearStmt->fetch();

            $studentStmt = $pdo->prepare(
                'SELECT s.id, s.first_name, s.last_name, s.student_number, s.gender,
                        se.id AS enrollment_id
                 FROM student_enrollments se
                 JOIN students s ON s.id = se.student_id
                 WHERE se.class_id = ? AND se.academic_year_id = ?
                   AND se.school_id = ? AND se.status = \'active\'
                 ORDER BY s.last_name, s.first_name'
            );
            $studentStmt->execute([$classId, $academicYearId, $schoolId]);
            $students = $studentStmt->fetchAll();

            $subjectStmt = $pdo->prepare('SELECT id, coefficient FROM subjects WHERE school_id = ?');
            $subjectStmt->execute([$schoolId]);
            $subjects          = $subjectStmt->fetchAll();
            $totalCoefficients = array_sum(array_column($subjects, 'coefficient'));

            $resultStmt = $pdo->prepare(
                'SELECT student_id, subject_id, AVG(score) AS avg_score
                 FROM exam_results
                 WHERE class_id = ? AND school_id = ?
                 GROUP BY student_id, subject_id'
            );
            $resultStmt->execute([$classId, $schoolId]);
            $resultMap = [];
            foreach ($resultStmt->fetchAll() as $r) {
                $resultMap[$r['student_id']][$r['subject_id']] = (float) $r['avg_score'];
            }

            $promoStmt = $pdo->prepare(
                'SELECT student_id, status, to_class_id, to_academic_year_id, notes
                 FROM promotion_records
                 WHERE school_id = ? AND from_class_id = ? AND from_academic_year_id = ?'
            );
            $promoStmt->execute([$schoolId, $classId, $academicYearId]);
            $existing = [];
            foreach ($promoStmt->fetchAll() as $d) {
                $existing[$d['student_id']] = $d;
            }

            $rows = [];
            foreach ($students as $student) {
                $sid = $student['id'];
                $totalPoints = 0.0;
                $markedCount = 0;

                foreach ($subjects as $subject) {
                    $score = $resultMap[$sid][$subject['id']] ?? null;
                    if ($score !== null) {
                        $totalPoints += $score * (int) $subject['coefficient'];
                        $markedCount++;
                    }
                }

                $annualAvg = ($totalCoefficients > 0 && $markedCount > 0)
                    ? round($totalPoints / $totalCoefficients, 2)
                    : null;

                $dec = $existing[$sid] ?? null;

                $rows[] = [
                    'student_id'     => $sid,
                    'enrollment_id'  => $student['enrollment_id'],
                    'student_number' => $student['student_number'],
                    'first_name'     => $student['first_name'],
                    'last_name'      => $student['last_name'],
                    'gender'         => $student['gender'],
                    'annual_avg'     => $annualAvg,
                    'decision'       => $dec ? $dec['status']              : null,
                    'to_class_id'    => $dec ? $dec['to_class_id']         : null,
                    'to_year_id'     => $dec ? $dec['to_academic_year_id'] : null,
                    'notes'          => $dec ? $dec['notes']               : null,
                ];
            }

            usort($rows, fn($a, $b) => ($b['annual_avg'] ?? -1) <=> ($a['annual_avg'] ?? -1));
            foreach ($rows as $i => &$row) { $row['rank'] = $i + 1; }

            $classesStmt = $pdo->prepare(
                'SELECT c.id, c.name, c.stream, ay.label AS year_label
                 FROM classes c
                 JOIN academic_years ay ON ay.id = c.academic_year_id
                 WHERE c.school_id = ? ORDER BY ay.start_date DESC, c.name'
            );
            $classesStmt->execute([$schoolId]);

            $yearsStmt = $pdo->prepare(
                'SELECT id, label, is_current FROM academic_years WHERE school_id = ? ORDER BY start_date DESC'
            );
            $yearsStmt->execute([$schoolId]);

            return [
                'success' => true,
                'preview' => [
                    'class'             => $class,
                    'class_id'          => $classId,
                    'academic_year'     => $year,
                    'academic_year_id'  => $academicYearId,
                    'total_coefficients'=> $totalCoefficients,
                    'students'          => $rows,
                    'available_classes' => $classesStmt->fetchAll(),
                    'available_years'   => $yearsStmt->fetchAll(),
                    'stats' => [
                        'total'   => count($rows),
                        'decided' => count(array_filter($rows, fn($r) => $r['decision'] !== null)),
                    ],
                ],
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Unable to load promotion preview', 'error' => $e->getMessage()];
        }
    }

    public static function apply(): array
    {
        try {
            Auth::check();

            $body          = json_decode(file_get_contents('php://input'), true) ?? [];
            $fromClassId   = (int) ($body['from_class_id']         ?? 0);
            $fromYearId    = (int) ($body['from_academic_year_id'] ?? 0);
            $decisions     = $body['decisions'] ?? [];

            if ($fromClassId <= 0 || $fromYearId <= 0) {
                return ['success' => false, 'message' => 'from_class_id and from_academic_year_id are required'];
            }
            if (empty($decisions)) {
                return ['success' => false, 'message' => 'No decisions provided'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);
            $user     = TenantContext::currentUser();
            $decidedBy = $user ? (int) $user->user_id : null;

            $upsertPromo = $pdo->prepare(
                'INSERT INTO promotion_records
                 (school_id, student_id, from_class_id, from_academic_year_id,
                  to_class_id, to_academic_year_id, status, annual_average, notes, decided_by, decided_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE
                     to_class_id         = VALUES(to_class_id),
                     to_academic_year_id = VALUES(to_academic_year_id),
                     status              = VALUES(status),
                     annual_average      = VALUES(annual_average),
                     notes               = VALUES(notes),
                     decided_by          = VALUES(decided_by),
                     decided_at          = NOW()'
            );

            $upsertEnroll = $pdo->prepare(
                'INSERT INTO student_enrollments
                 (school_id, student_id, class_id, academic_year_id, status)
                 VALUES (?, ?, ?, ?, \'active\')
                 ON DUPLICATE KEY UPDATE status = \'active\''
            );

            $saved = 0; $enrolled = 0;

            foreach ($decisions as $d) {
                $studentId = (int)   ($d['student_id'] ?? 0);
                $status    = trim    ($d['status']     ?? '');
                $toClassId = isset($d['to_class_id']) && $d['to_class_id'] ? (int) $d['to_class_id'] : null;
                $toYearId  = isset($d['to_year_id'])  && $d['to_year_id']  ? (int) $d['to_year_id']  : null;
                $annualAvg = isset($d['annual_avg'])   ? (float) $d['annual_avg']  : null;
                $notes     = trim($d['notes'] ?? '');

                if ($studentId <= 0 || !in_array($status, ['promoted','repeated','withdrawn'])) continue;

                $upsertPromo->execute([
                    $schoolId, $studentId, $fromClassId, $fromYearId,
                    $toClassId, $toYearId, $status, $annualAvg,
                    $notes ?: null, $decidedBy,
                ]);
                $saved++;

                if ($status !== 'withdrawn' && $toClassId && $toYearId) {
                    $upsertEnroll->execute([$schoolId, $studentId, $toClassId, $toYearId]);
                    $enrolled++;
                }

                if (in_array($status, ['promoted','withdrawn'])) {
                    $pdo->prepare(
                        'UPDATE student_enrollments SET status = ?
                         WHERE school_id=? AND student_id=? AND class_id=? AND academic_year_id=?'
                    )->execute([$status, $schoolId, $studentId, $fromClassId, $fromYearId]);
                }
            }

            return [
                'success'  => true,
                'message'  => "{$saved} decision(s) saved. {$enrolled} student(s) enrolled for next year.",
                'saved'    => $saved,
                'enrolled' => $enrolled,
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Unable to apply promotions', 'error' => $e->getMessage()];
        }
    }
}
