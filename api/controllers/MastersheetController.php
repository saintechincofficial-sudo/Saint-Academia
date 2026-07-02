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
     * Generate the mastersheet exactly as the official MINESEC format.
     * Each subject cell shows POINTS = (avg_mark / 20) * coefficient * 20
     *                                = avg_mark * coefficient
     * TM  = sum of all points
     * TC  = sum of all coefficients
     * AVG/20 = TM / TC
     */
    public static function generate(): array
    {
        try {
            Auth::check();

            $classId = isset($_GET['class_id']) ? (int) $_GET['class_id'] : 0;
            $termId  = isset($_GET['term_id'])  ? (int) $_GET['term_id']  : 0;

            if ($classId <= 0 || $termId <= 0) {
                return ['success' => false, 'message' => 'class_id and term_id are required'];
            }

            $pdo            = getDatabaseConnection();
            $schoolId       = SchoolHelper::resolveSchoolId($pdo);
            $academicYearId = SchoolHelper::resolveAcademicYearId($pdo, $schoolId);

            // Term info
            $termStmt = $pdo->prepare(
                'SELECT t.id, t.term_number, t.label, ay.label AS year_label
                 FROM terms t
                 JOIN academic_years ay ON ay.id = t.academic_year_id
                 WHERE t.id = ?'
            );
            $termStmt->execute([$termId]);
            $term = $termStmt->fetch();
            if (!$term) return ['success' => false, 'message' => 'Term not found'];

            // Class info
            $classStmt = $pdo->prepare(
                'SELECT c.name, c.stream, cl.name AS level_name
                 FROM classes c
                 LEFT JOIN class_levels cl ON cl.id = c.level_id
                 WHERE c.id = ? AND c.school_id = ?'
            );
            $classStmt->execute([$classId, $schoolId]);
            $class = $classStmt->fetch();
            if (!$class) return ['success' => false, 'message' => 'Class not found'];

            // School info
            $schoolStmt = $pdo->prepare(
                'SELECT name, name_fr, email, phone, address FROM schools WHERE id = ?'
            );
            $schoolStmt->execute([$schoolId]);
            $school = $schoolStmt->fetch();

            // Enrolled students ordered by name
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
                return ['success' => false,
                    'message' => 'No students enrolled in this class. Go to Enrollment first.'];
            }

            // Subjects with coefficients
            $subjectStmt = $pdo->prepare(
                'SELECT id, name, name_fr, code, coefficient
                 FROM subjects WHERE school_id = ? ORDER BY name'
            );
            $subjectStmt->execute([$schoolId]);
            $subjects = $subjectStmt->fetchAll();

            if (empty($subjects)) {
                return ['success' => false,
                    'message' => 'No subjects configured. Go to Subjects first.'];
            }

            // All results for this class + term
            // Average multiple entries (sequences) per student/subject automatically
            $resultStmt = $pdo->prepare(
                'SELECT student_id, subject_id, AVG(score) AS avg_score, COUNT(*) AS entry_count
                 FROM exam_results
                 WHERE class_id = ? AND term_id = ? AND school_id = ?
                 GROUP BY student_id, subject_id'
            );
            $resultStmt->execute([$classId, $termId, $schoolId]);
            $allResults = $resultStmt->fetchAll();

            // Index: resultMap[student_id][subject_id] = avg_score
            $resultMap = [];
            foreach ($allResults as $r) {
                $resultMap[$r['student_id']][$r['subject_id']] = round((float) $r['avg_score'], 2);
            }

            $totalCoefficients = array_sum(array_column($subjects, 'coefficient'));

            // Build student rows
            $rows = [];
            foreach ($students as $student) {
                $sid         = $student['id'];
                $subjectCells = [];
                $totalPoints  = 0.0;

                foreach ($subjects as $subject) {
                    $subId    = $subject['id'];
                    $coef     = (int) $subject['coefficient'];
                    $avgScore = $resultMap[$sid][$subId] ?? null;

                    // Points = avg_score * coefficient  (displayed in mastersheet cell)
                    $points = $avgScore !== null ? round($avgScore * $coef, 2) : null;

                    if ($points !== null) {
                        $totalPoints += $points;
                    }

                    $subjectCells[] = [
                        'subject_id'  => $subId,
                        'coefficient' => $coef,
                        'avg_score'   => $avgScore,   // raw /20 (stored, not displayed)
                        'points'      => $points,     // what mastersheet shows
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

            // Sort by AVG descending and assign rank
            usort($rows, function ($a, $b) {
                if ($a['avg'] === null && $b['avg'] === null) return 0;
                if ($a['avg'] === null) return 1;
                if ($b['avg'] === null) return -1;
                return $b['avg'] <=> $a['avg'];
            });

            $rank    = 1;
            $prevAvg = null;
            for ($i = 0; $i < count($rows); $i++) {
                if ($rows[$i]['avg'] === null) {
                    $rows[$i]['rank'] = '-';
                    continue;
                }
                if ($rows[$i]['avg'] !== $prevAvg) $rank = $i + 1;
                $rows[$i]['rank'] = $rank;
                $prevAvg = $rows[$i]['avg'];
            }

            // Class statistics
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
                    'term'               => $term,
                    'term_id'            => $termId,
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

    /**
     * Save marks for a whole class at once.
     * Works for both CBA (one SE mark) and Traditional (one or two sequence marks).
     * The mastersheet always uses AVG of whatever is entered.
     */
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
                return ['success' => false,
                    'message' => 'class_id, term_id and subject_id are required'];
            }
            if (empty($marks)) {
                return ['success' => false, 'message' => 'marks array is required'];
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

            return [
                'success' => true,
                'message' => "{$saved} mark(s) saved successfully",
                'saved'   => $saved,
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Unable to save marks',
                    'error' => $e->getMessage()];
        }
    }
}
