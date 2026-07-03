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
    private static function grade(float $s): string
    {
        if ($s >= 18) return 'A+'; if ($s >= 16) return 'A';
        if ($s >= 14) return 'B+'; if ($s >= 12) return 'B';
        if ($s >= 10) return 'C';  if ($s >= 8)  return 'D';
        return 'F';
    }
    private static function remarks(float $s): string
    {
        if ($s >= 18) return 'Excellent';   if ($s >= 16) return 'Tres Bien';
        if ($s >= 14) return 'Bien';        if ($s >= 12) return 'Assez Bien';
        if ($s >= 10) return 'Passable';    if ($s >= 8)  return 'Insuffisant';
        return 'Tres Insuffisant';
    }

    /**
     * Build student rows from a result map.
     */
    private static function buildRows(array $students, array $subjects, array $resultMap, int $totalCoefficients): array
    {
        $rows = [];
        foreach ($students as $student) {
            $sid          = $student['id'];
            $subjectCells = [];
            $totalPoints  = 0.0;
            $sat          = false;

            foreach ($subjects as $subject) {
                $subId    = $subject['id'];
                $coef     = (int) $subject['coefficient'];
                $avgScore = $resultMap[$sid][$subId] ?? null;
                $points   = $avgScore !== null ? round($avgScore * $coef, 2) : null;
                if ($points !== null) { $totalPoints += $points; $sat = true; }
                $subjectCells[] = [
                    'subject_id'  => $subId,
                    'coefficient' => $coef,
                    'avg_score'   => $avgScore,
                    'points'      => $points,
                ];
            }

            $generalAvg = ($totalCoefficients > 0 && $sat)
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
                'sat'            => $sat,
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
        return $rows;
    }

    /**
     * Compute class stats from rows.
     */
    private static function calcStats(array $rows): array
    {
        $avgs      = array_values(array_filter(array_column($rows, 'avg'), fn($v) => $v !== null));
        $sat       = count(array_filter($rows, fn($r) => $r['sat']));
        $passCount = count(array_filter($rows, fn($r) => $r['pass'] === true));
        $failCount = count(array_filter($rows, fn($r) => $r['pass'] === false));
        $classAvg  = count($avgs) > 0 ? round(array_sum($avgs) / count($avgs), 2) : null;
        return [
            'total_students' => count($rows),
            'sat_count'      => $sat,
            'pass_count'     => $passCount,
            'fail_count'     => $failCount,
            'class_average'  => $classAvg,
            'highest_avg'    => count($avgs) > 0 ? max($avgs) : null,
            'lowest_avg'     => count($avgs) > 0 ? min($avgs) : null,
            'pass_rate'      => $sat > 0 ? round(($passCount / $sat) * 100, 1) : 0,
        ];
    }

    /**
     * Fetch result map for given class, school and sequence list.
     */
    private static function fetchResultMap(\PDO $pdo, int $classId, int $schoolId, array $sequences): array
    {
        $seqIn = implode(',', array_map('intval', $sequences));
        $stmt  = $pdo->prepare(
            "SELECT er.student_id, er.subject_id, AVG(er.score) AS avg_score
             FROM exam_results er
             WHERE er.class_id = ? AND er.school_id = ? AND er.sequence IN ($seqIn)
             GROUP BY er.student_id, er.subject_id"
        );
        $stmt->execute([$classId, $schoolId]);
        $map = [];
        foreach ($stmt->fetchAll() as $r) {
            $map[$r['student_id']][$r['subject_id']] = round((float) $r['avg_score'], 2);
        }
        return $map;
    }

    public static function generate(): array
    {
        try {
            Auth::check();

            $classId        = isset($_GET['class_id'])         ? (int) $_GET['class_id']         : 0;
            $academicYearId = isset($_GET['academic_year_id']) ? (int) $_GET['academic_year_id'] : 0;
            $viewMode       = isset($_GET['view_mode'])         ? trim($_GET['view_mode'])         : 'term1';

            if ($classId <= 0)        return ['success' => false, 'message' => 'class_id is required'];
            if ($academicYearId <= 0) return ['success' => false, 'message' => 'academic_year_id is required'];

            $sequenceMap = [
                'term1'  => [1, 2],
                'term2'  => [3, 4],
                'term3'  => [5, 6],
                'annual' => [1, 2, 3, 4, 5, 6],
            ];
            if (!isset($sequenceMap[$viewMode])) {
                return ['success' => false, 'message' => 'Invalid view_mode'];
            }

            $viewLabels = [
                'term1'  => 'First Term',
                'term2'  => 'Second Term',
                'term3'  => 'Third Term',
                'annual' => 'Annual Results',
            ];

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            // Year
            $yearStmt = $pdo->prepare('SELECT id, label FROM academic_years WHERE id = ? AND school_id = ?');
            $yearStmt->execute([$academicYearId, $schoolId]);
            $year = $yearStmt->fetch();
            if (!$year) return ['success' => false, 'message' => 'Academic year not found'];

            // Class
            $classStmt = $pdo->prepare(
                'SELECT c.name, c.stream, cl.name AS level_name
                 FROM classes c LEFT JOIN class_levels cl ON cl.id = c.level_id
                 WHERE c.id = ? AND c.school_id = ? AND c.academic_year_id = ?'
            );
            $classStmt->execute([$classId, $schoolId, $academicYearId]);
            $class = $classStmt->fetch();
            if (!$class) return ['success' => false, 'message' => 'Class not found for this year'];

            // School
            $schoolStmt = $pdo->prepare(
                'SELECT name, name_fr, email, phone, address,
                        logo_path, letterhead_path, motto, region, delegation
                 FROM schools WHERE id = ?'
            );
            $schoolStmt->execute([$schoolId]);
            $school = $schoolStmt->fetch();

            // Students
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
            if (empty($students)) return ['success' => false, 'message' => 'No students enrolled'];

            // Subjects
            $subjectStmt = $pdo->prepare(
                'SELECT id, name, name_fr, code, coefficient FROM subjects WHERE school_id = ? ORDER BY name'
            );
            $subjectStmt->execute([$schoolId]);
            $subjects = $subjectStmt->fetchAll();
            if (empty($subjects)) return ['success' => false, 'message' => 'No subjects configured'];

            $totalCoefficients = array_sum(array_column($subjects, 'coefficient'));

            // Main term results
            $resultMap = self::fetchResultMap($pdo, $classId, $schoolId, $sequenceMap[$viewMode]);
            $rows      = self::buildRows($students, $subjects, $resultMap, $totalCoefficients);
            $stats     = self::calcStats($rows);

            // For Term 3: also compute annual results (all 6 sequences)
            $annualRows  = null;
            $annualStats = null;
            if ($viewMode === 'term3') {
                $annualMap   = self::fetchResultMap($pdo, $classId, $schoolId, [1,2,3,4,5,6]);
                $annualRows  = self::buildRows($students, $subjects, $annualMap, $totalCoefficients);
                $annualStats = self::calcStats($annualRows);
            }

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
                    'sequences'          => $sequenceMap[$viewMode],
                    'subjects'           => $subjects,
                    'total_coefficients' => $totalCoefficients,
                    'rows'               => $rows,
                    'stats'              => $stats,
                    'annual_rows'        => $annualRows,
                    'annual_stats'       => $annualStats,
                ],
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Unable to generate mastersheet', 'error' => $e->getMessage()];
        }
    }

    public static function bulkResults(): array
    {
        try {
            Auth::check();
            $body      = json_decode(file_get_contents('php://input'), true) ?? [];
            $classId   = (int) ($body['class_id']  ?? 0);
            $termId    = (int) ($body['term_id']    ?? 0);
            $subjectId = (int) ($body['subject_id'] ?? 0);
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
                 (school_id,student_id,subject_id,class_id,term_id,
                  exam_type,score,max_score,grade,remarks,sequence,created_at)
                 VALUES (?,?,?,?,?,?,?,20,?,?,?,NOW())
                 ON DUPLICATE KEY UPDATE
                     score=VALUES(score), grade=VALUES(grade),
                     remarks=VALUES(remarks), exam_type=VALUES(exam_type)'
            );
            $saved = 0;
            foreach ($marks as $mark) {
                $studentId = (int) ($mark['student_id'] ?? 0);
                $score     = isset($mark['score']) && $mark['score'] !== '' ? (float) $mark['score'] : null;
                if ($studentId <= 0 || $score === null || $score < 0 || $score > 20) continue;
                $stmt->execute([
                    $schoolId, $studentId, $subjectId, $classId, $termId,
                    $examType, $score, self::grade($score), self::remarks($score), $sequence,
                ]);
                $saved++;
            }
            return ['success' => true, 'message' => "{$saved} mark(s) saved", 'saved' => $saved];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Unable to save marks', 'error' => $e->getMessage()];
        }
    }
}
