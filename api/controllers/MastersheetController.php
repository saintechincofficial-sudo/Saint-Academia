<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/SchoolHelper.php';

class MastersheetController
{
    private static function mention(float $avg): string
    {
        if ($avg >= 18) return 'Excellent';
        if ($avg >= 16) return 'Tres Bien';
        if ($avg >= 14) return 'Bien';
        if ($avg >= 12) return 'Assez Bien';
        if ($avg >= 10) return 'Passable';
        return 'Insuffisant';
    }

    private static function grade(float $score): string
    {
        if ($score >= 18) return 'A+';
        if ($score >= 16) return 'A';
        if ($score >= 14) return 'B+';
        if ($score >= 12) return 'B';
        if ($score >= 10) return 'C';
        if ($score >= 8)  return 'D';
        return 'F';
    }

    private static function remarks(float $score): string
    {
        if ($score >= 18) return 'Excellent';
        if ($score >= 16) return 'Tres Bien';
        if ($score >= 14) return 'Bien';
        if ($score >= 12) return 'Assez Bien';
        if ($score >= 10) return 'Passable';
        if ($score >= 8)  return 'Insuffisant';
        return 'Tres Insuffisant';
    }

    /**
     * Generate the mastersheet.
     *
     * GET params:
     *   class_id        required
     *   academic_year_id required
     *   view_mode       required: term1 | term2 | term3 | annual
     *
     * view_mode maps to sequence ranges:
     *   term1  → sequences 1,2
     *   term2  → sequences 3,4
     *   term3  → sequences 5,6
     *   annual → all sequences (annual average)
     */
    public static function generate(): array
    {
        try {
            Auth::check();

            $classId       = isset($_GET['class_id'])         ? (int)    $_GET['class_id']         : 0;
            $academicYearId = isset($_GET['academic_year_id']) ? (int)    $_GET['academic_year_id'] : 0;
            $viewMode      = isset($_GET['view_mode'])         ? trim($_GET['view_mode'])            : 'term1';

            if ($classId <= 0)        return ['success' => false, 'message' => 'class_id is required'];
            if ($academicYearId <= 0) return ['success' => false, 'message' => 'academic_year_id is required'];

            $sequenceMap = [
                'term1'  => [1, 2],
                'term2'  => [3, 4],
                'term3'  => [5, 6],
                'annual' => [1, 2, 3, 4, 5, 6],
            ];

            if (!isset($sequenceMap[$viewMode])) {
                return ['success' => false, 'message' => 'Invalid view_mode. Use term1, term2, term3 or annual'];
            }

            $sequences = $sequenceMap[$viewMode];
            $seqIn     = implode(',', $sequences);

            $viewLabels = [
                'term1'  => 'First Term',
                'term2'  => 'Second Term',
                'term3'  => 'Third Term',
                'annual' => 'Annual Results',
            ];

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            // Academic year info
            $yearStmt = $pdo->prepare('SELECT id, label FROM academic_years WHERE id = ? AND school_id = ?');
            $yearStmt->execute([$academicYearId, $schoolId]);
            $year = $yearStmt->fetch();
            if (!$year) return ['success' => false, 'message' => 'Academic year not found'];

            // Class info
            $classStmt = $pdo->prepare(
                'SELECT c.name, c.stream, cl.name AS level_name
                 FROM classes c
                 LEFT JOIN class_levels cl ON cl.id = c.level_id
                 WHERE c.id = ? AND c.school_id = ? AND c.academic_year_id = ?'
            );
            $classStmt->execute([$classId, $schoolId, $academicYearId]);
            $class = $classStmt->fetch();
            if (!$class) return ['success' => false, 'message' => 'Class not found for this year'];

            // School info
            $schoolStmt = $pdo->prepare(
                'SELECT name, name_fr, email, phone, address, logo_path, letterhead_path, motto, region, delegation
                 FROM schools WHERE id = ?'
            );
            $schoolStmt->execute([$schoolId]);
            $school = $schoolStmt->fetch();

            // Enrolled students
            $studentStmt = $pdo->prepare(
                'SELECT s.id, s.first_name, s.last_name, s.student_number, s.gender
                 FROM student_enrollments se
                 JOIN students s ON s.id = se.student_id
                 WHERE se.class_id = ? AND se.academic_year_id = ?
                   AND se.school_id = ? AND se.status = \'active\'
                 ORDER BY s.last_name, s.first_name'
            );
            $studentStmt->execute([$classId, $academicYearId, $schoolId]);
            $students = $studentStmt->fetchAll();

            if (empty($students)) {
                return ['success' => false, 'message' => 'No students enrolled in this class'];
            }

            // Subjects with coefficients
            $subjectStmt = $pdo->prepare(
                'SELECT id, name, name_fr, code, coefficient FROM subjects WHERE school_id = ? ORDER BY name'
            );
            $subjectStmt->execute([$schoolId]);
            $subjects = $subjectStmt->fetchAll();

            if (empty($subjects)) {
                return ['success' => false, 'message' => 'No subjects configured'];
            }

            // Results for this class filtered by sequence range
            $resultStmt = $pdo->prepare(
                "SELECT er.student_id, er.subject_id, AVG(er.score) AS avg_score
                 FROM exam_results er
                 WHERE er.class_id = ?
                   AND er.school_id = ?
                   AND er.sequence IN ($seqIn)
                 GROUP BY er.student_id, er.subject_id"
            );
            $resultStmt->execute([$classId, $schoolId]);

            $resultMap = [];
            foreach ($resultStmt->fetchAll() as $r) {
                $resultMap[$r['student_id']][$r['subject_id']] = round((float) $r['avg_score'], 2);
            }

            $totalCoefficients = array_sum(array_column($subjects, 'coefficient'));

            // Build rows
            $rows = [];
            foreach ($students as $student) {
                $sid         = $student['id'];
                $subjectCells = [];
                $totalPoints  = 0.0;

                foreach ($subjects as $subject) {
                    $subId    = $subject['id'];
                    $coef     = (int) $subject['coefficient'];
                    $avgScore = $resultMap[$sid][$subId] ?? null;
                    $points   = $avgScore !== null ? round($avgScore * $coef, 2) : null;

                    if ($points !== null) $totalPoints += $points;

                    $subjectCells[] = [
                        'subject_id'  => $subId,
                        'coefficient' => $coef,
                        'avg_score'   => $avgScore,
                        'points'      => $points,
                    ];
                }

                $generalAvg = $totalCoefficients > 0
                    ? round($totalPoints / $totalCoefficients, 2)
                    : null;

                $rows[] = [
                    'student_id'     => $sid,
                    'student_number' => $student['student_number'],
                    'first_name'     => $student['first_name'],
                    'last_name'      => $student['last_name'],
                    'gender'         => $student['gender'],
                    'cells'          => $subjectCells,
                    'tm'             => round($totalPoints, 2),
                    'tc'             => $totalCoefficients,
                    'avg'            => $generalAvg,
                    'pass'           => $generalAvg !== null ? $generalAvg >= 10 : null,
                    'mention'        => $generalAvg !== null ? self::mention($generalAvg) : '-',
                    'absences'       => 0,
                    'rank'           => null,
                ];
            }

            // Sort by AVG desc, assign rank
            usort($rows, fn($a, $b) =>
                $a['avg'] === null && $b['avg'] === null ? 0 :
                ($a['avg'] === null ? 1 : ($b['avg'] === null ? -1 : $b['avg'] <=> $a['avg']))
            );

            $rank = 1; $prevAvg = null;
            for ($i = 0; $i < count($rows); $i++) {
                if ($rows[$i]['avg'] === null) { $rows[$i]['rank'] = '-'; continue; }
                if ($rows[$i]['avg'] !== $prevAvg) $rank = $i + 1;
                $rows[$i]['rank'] = $rank;
                $prevAvg = $rows[$i]['avg'];
            }

            $avgs      = array_values(array_filter(array_column($rows, 'avg'), fn($v) => $v !== null));
            $classAvg  = count($avgs) > 0 ? round(array_sum($avgs) / count($avgs), 2) : null;
            $passCount = count(array_filter($rows, fn($r) => $r['pass'] === true));
            $failCount = count(array_filter($rows, fn($r) => $r['pass'] === false));

            return [
                'success' => true,
                'mastersheet' => [
                    'school'             => $school,
                    'class'              => $class,
                    'class_id'           => $classId,
                    'academic_year'      => $year,
                    'academic_year_id'   => $academicYearId,
                    'view_mode'          => $viewMode,
                    'view_label'         => $viewLabels[$viewMode],
                    'sequences'          => $sequences,
                    'subjects'           => $subjects,
                    'total_coefficients' => $totalCoefficients,
                    'rows'               => $rows,
                    'stats' => [
                        'total_students' => count($rows),
                        'class_average'  => $classAvg,
                        'pass_count'     => $passCount,
                        'fail_count'     => $failCount,
                        'pass_rate'      => count($rows) > 0
                            ? round(($passCount / count($rows)) * 100, 1) : 0,
                    ],
                ],
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Unable to generate mastersheet',
                    'error' => $e->getMessage()];
        }
    }

    public static function bulkResults(): array
    {
        try {
            Auth::check();

            $body      = json_decode(file_get_contents('php://input'), true) ?? [];
            $classId   = (int) ($body['class_id']   ?? 0);
            $termId    = (int) ($body['term_id']     ?? 0);
            $subjectId = (int) ($body['subject_id']  ?? 0);
            $sequence  = isset($body['sequence']) ? (int) $body['sequence'] : null;
            $examType  = trim($body['exam_type'] ?? 'Term');
            $marks     = $body['marks'] ?? [];

            if ($classId <= 0 || $termId <= 0 || $subjectId <= 0) {
                return ['success' => false, 'message' => 'class_id, term_id and subject_id are required'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $stmt = $pdo->prepare(
                'INSERT INTO exam_results
                 (school_id, student_id, subject_id, class_id, term_id,
                  exam_type, score, max_score, grade, remarks, sequence, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 20, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE
                     score    = VALUES(score),
                     grade    = VALUES(grade),
                     remarks  = VALUES(remarks),
                     exam_type = VALUES(exam_type)'
            );

            $saved = 0;
            foreach ($marks as $mark) {
                $studentId = (int)   ($mark['student_id'] ?? 0);
                $score     = isset($mark['score']) && $mark['score'] !== '' ? (float) $mark['score'] : null;
                if ($studentId <= 0 || $score === null) continue;
                if ($score < 0 || $score > 20) continue;
                $stmt->execute([
                    $schoolId, $studentId, $subjectId, $classId, $termId,
                    $examType, $score, self::grade($score), self::remarks($score), $sequence,
                ]);
                $saved++;
            }

            return ['success' => true, 'message' => "{$saved} mark(s) saved successfully", 'saved' => $saved];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Unable to save marks', 'error' => $e->getMessage()];
        }
    }
}
