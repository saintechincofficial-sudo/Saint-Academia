<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/SchoolHelper.php';

class ReportCardController
{
    private static function cbaRemark(float $avg): string
    {
        if ($avg >= 16) return 'Competence Well Acquired(CWA)';
        if ($avg >= 10) return 'Competence Averagely Acquired(CAA)';
        return 'Competence Not Acquired(CNA)';
    }

    private static function academicWork(float $avg): string
    {
        if ($avg >= 16) return 'Distinction';
        if ($avg >= 14) return 'Honour Roll';
        if ($avg >= 12) return 'Credit';
        if ($avg >= 10) return 'Pass';
        return 'Below Average';
    }

    private static function appreciation(float $avg): string
    {
        if ($avg >= 16) return 'Competence Well Acquired(CWA)';
        if ($avg >= 10) return 'Competence Averagely Acquired(CAA)';
        return 'Competence Not Acquired(CNA)';
    }

    public static function generate(): array
    {
        try {
            Auth::check();

            $studentId      = isset($_GET['student_id'])       ? (int)$_GET['student_id']       : 0;
            $classId        = isset($_GET['class_id'])         ? (int)$_GET['class_id']         : 0;
            $academicYearId = isset($_GET['academic_year_id']) ? (int)$_GET['academic_year_id'] : 0;
            $termId         = isset($_GET['term_id'])          ? (int)$_GET['term_id']          : 0;

            if (!$studentId || !$classId || !$academicYearId || !$termId) {
                return ['success' => false, 'message' => 'student_id, class_id, academic_year_id and term_id are required'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            // School
            $stmt = $pdo->prepare('SELECT * FROM schools WHERE id = ?');
            $stmt->execute([$schoolId]);
            $school = $stmt->fetch();

            // Student
            $stmt = $pdo->prepare('SELECT * FROM students WHERE id = ? AND school_id = ?');
            $stmt->execute([$studentId, $schoolId]);
            $student = $stmt->fetch();
            if (!$student) return ['success' => false, 'message' => 'Student not found'];

            // Class with teacher
            $stmt = $pdo->prepare(
                'SELECT c.*, cl.name AS level_name,
                        CONCAT(st.first_name, " ", st.last_name) AS teacher_name
                 FROM classes c
                 LEFT JOIN class_levels cl ON cl.id = c.level_id
                 LEFT JOIN staff st ON st.id = c.class_teacher_id
                 WHERE c.id = ? AND c.school_id = ?'
            );
            $stmt->execute([$classId, $schoolId]);
            $class = $stmt->fetch();
            if (!$class) return ['success' => false, 'message' => 'Class not found'];

            // Academic year
            $stmt = $pdo->prepare('SELECT * FROM academic_years WHERE id = ? AND school_id = ?');
            $stmt->execute([$academicYearId, $schoolId]);
            $year = $stmt->fetch();
            if (!$year) return ['success' => false, 'message' => 'Academic year not found'];

            // Term
            $stmt = $pdo->prepare('SELECT * FROM terms WHERE id = ?');
            $stmt->execute([$termId]);
            $term = $stmt->fetch();
            if (!$term) return ['success' => false, 'message' => 'Term not found'];

            // Sequences for this term
            $seqMap    = [1 => [1,2], 2 => [3,4], 3 => [5,6]];
            $sequences = $seqMap[$term['term_number']] ?? [1,2];
            $seq1Num   = $sequences[0];
            $seq2Num   = $sequences[1];

            // Subjects
            $stmt = $pdo->prepare('SELECT * FROM subjects WHERE school_id = ? ORDER BY name');
            $stmt->execute([$schoolId]);
            $subjects = $stmt->fetchAll();
            $totalCoeff = array_sum(array_column($subjects, 'coefficient'));

            // Get results for this student - both sequences
            $stmt = $pdo->prepare(
                'SELECT subject_id, sequence, AVG(score) AS score
                 FROM exam_results
                 WHERE student_id = ? AND class_id = ? AND school_id = ?
                   AND sequence IN (?,?)
                 GROUP BY subject_id, sequence'
            );
            $stmt->execute([$studentId, $classId, $schoolId, $seq1Num, $seq2Num]);
            $rawResults = $stmt->fetchAll();

            // Map: [subject_id][sequence] = score
            $scoreMap = [];
            foreach ($rawResults as $r) {
                $scoreMap[$r['subject_id']][$r['sequence']] = round((float)$r['score'], 2);
            }

            // Get per-subject positions for all students in this class
            // For each subject, rank all students by term avg
            $stmt = $pdo->prepare(
                'SELECT er.student_id, er.subject_id,
                        AVG(er.score) AS avg_score
                 FROM exam_results er
                 WHERE er.class_id = ? AND er.school_id = ?
                   AND er.sequence IN (?,?)
                 GROUP BY er.student_id, er.subject_id'
            );
            $stmt->execute([$classId, $schoolId, $seq1Num, $seq2Num]);
            $allSubjectResults = $stmt->fetchAll();

            // Build subject ranking map [subject_id] => sorted array of student_ids
            $subjectRankMap = [];
            foreach ($allSubjectResults as $r) {
                $subjectRankMap[$r['subject_id']][] = [
                    'student_id' => $r['student_id'],
                    'avg'        => (float)$r['avg_score'],
                ];
            }
            $positionMap = [];
            foreach ($subjectRankMap as $subId => $rows) {
                usort($rows, fn($a,$b) => $b['avg'] <=> $a['avg']);
                foreach ($rows as $i => $row) {
                    if ((int)$row['student_id'] === $studentId) {
                        $positionMap[$subId] = $i + 1;
                        break;
                    }
                }
            }

            // Get teacher assignments per subject
            // Using staff_subject_assignments if exists, else class teacher
            $teacherMap = [];
            try {
                $stmt = $pdo->prepare(
                    'SELECT ssa.subject_id,
                            CONCAT(st.first_name, " ", st.last_name) AS teacher_name
                     FROM staff_subject_assignments ssa
                     JOIN staff st ON st.id = ssa.staff_id
                     WHERE ssa.class_id = ?'
                );
                $stmt->execute([$classId]);
                foreach ($stmt->fetchAll() as $r) {
                    $teacherMap[$r['subject_id']] = $r['teacher_name'];
                }
            } catch (Throwable $e) {
                // Table may not exist yet, skip
            }

            // Build subject rows
            $subjectRows  = [];
            $totalPoints  = 0.0;
            $subjectsSat  = 0;
            $subjectsPassed = 0;

            foreach ($subjects as $subj) {
                $sid  = $subj['id'];
                $coef = (int)$subj['coefficient'];

                $s1 = $scoreMap[$sid][$seq1Num] ?? null;
                $s2 = $scoreMap[$sid][$seq2Num] ?? null;

                // Term avg = average of both sequences
                if ($s1 !== null && $s2 !== null) {
                    $termAvg = round(($s1 + $s2) / 2, 2);
                } elseif ($s1 !== null) {
                    $termAvg = $s1;
                } elseif ($s2 !== null) {
                    $termAvg = $s2;
                } else {
                    $termAvg = null;
                }

                $points = $termAvg !== null ? round($termAvg * $coef, 2) : null;
                if ($points !== null) {
                    $totalPoints += $points;
                    $subjectsSat++;
                    if ($termAvg >= 10) $subjectsPassed++;
                }

                $subjectRows[] = [
                    'subject_id'   => $sid,
                    'name'         => $subj['name'],
                    'name_fr'      => $subj['name_fr'],
                    'code'         => $subj['code'],
                    'coefficient'  => $coef,
                    'seq1'         => $s1,
                    'seq2'         => $s2,
                    'term_avg'     => $termAvg,
                    'total'        => $points,
                    'position'     => $positionMap[$sid] ?? null,
                    'remark'       => $termAvg !== null ? self::cbaRemark($termAvg) : '-',
                    'teacher'      => $teacherMap[$sid] ?? ($class['teacher_name'] ?? '-'),
                ];
            }

            // General average
            $generalAvg = ($totalCoeff > 0 && $subjectsSat > 0)
                ? round($totalPoints / $totalCoeff, 2) : null;

            // Class ranking - get all students general averages
            $stmt = $pdo->prepare(
                'SELECT se.student_id,
                        ROUND(SUM(er.score * sub.coefficient) / SUM(sub.coefficient), 2) AS wavg
                 FROM student_enrollments se
                 JOIN exam_results er  ON er.student_id = se.student_id
                                      AND er.class_id   = se.class_id
                                      AND er.school_id  = se.school_id
                                      AND er.sequence IN (?,?)
                 JOIN subjects sub ON sub.id = er.subject_id
                 WHERE se.class_id = ? AND se.academic_year_id = ?
                   AND se.school_id = ? AND se.status = "active"
                 GROUP BY se.student_id
                 ORDER BY wavg DESC'
            );
            $stmt->execute([$seq1Num, $seq2Num, $classId, $academicYearId, $schoolId]);
            $classRankings = $stmt->fetchAll();

            $classSize = count($classRankings);
            $rank      = null;
            $highestAvg = null;
            $lowestAvg  = null;
            $classAvgs  = array_column($classRankings, 'wavg');

            if (!empty($classAvgs)) {
                $highestAvg = max($classAvgs);
                $lowestAvg  = min($classAvgs);
            }

            foreach ($classRankings as $i => $row) {
                if ((int)$row['student_id'] === $studentId) {
                    $rank = $i + 1;
                    break;
                }
            }

            // Previous terms averages
            $prevTerms = [];
            $allTerms  = [
                ['term_number' => 1, 'seq' => [1,2]],
                ['term_number' => 2, 'seq' => [3,4]],
                ['term_number' => 3, 'seq' => [5,6]],
            ];
            foreach ($allTerms as $t) {
                $sIn = implode(',', $t['seq']);
                $s   = $pdo->prepare(
                    "SELECT ROUND(SUM(er.score * sub.coefficient) / SUM(sub.coefficient), 2) AS avg
                     FROM exam_results er
                     JOIN subjects sub ON sub.id = er.subject_id
                     WHERE er.student_id = ? AND er.class_id = ?
                       AND er.school_id = ? AND er.sequence IN ($sIn)"
                );
                $s->execute([$studentId, $classId, $schoolId]);
                $r = $s->fetch();
                $prevTerms[$t['term_number']] = $r['avg'] ?? null;
            }

            $annualAvg = null;
            $validTermAvgs = array_filter($prevTerms, fn($v) => $v !== null);
            if (!empty($validTermAvgs)) {
                $annualAvg = round(array_sum($validTermAvgs) / count($validTermAvgs), 2);
            }

            // Annual position
            $annualRankStmt = $pdo->prepare(
                'SELECT se.student_id,
                        ROUND(AVG(er.score * sub.coefficient / sub.coefficient), 2) AS wavg
                 FROM student_enrollments se
                 JOIN exam_results er  ON er.student_id = se.student_id
                                      AND er.class_id   = se.class_id
                                      AND er.school_id  = se.school_id
                 JOIN subjects sub ON sub.id = er.subject_id
                 WHERE se.class_id = ? AND se.academic_year_id = ?
                   AND se.school_id = ? AND se.status = "active"
                 GROUP BY se.student_id
                 ORDER BY wavg DESC'
            );
            $annualRankStmt->execute([$classId, $academicYearId, $schoolId]);
            $annualRankings  = $annualRankStmt->fetchAll();
            $annualPosition  = null;
            foreach ($annualRankings as $i => $row) {
                if ((int)$row['student_id'] === $studentId) {
                    $annualPosition = $i + 1;
                    break;
                }
            }

            // Attendance
            $attStmt = $pdo->prepare(
                'SELECT
                    SUM(CASE WHEN ar.status="present" THEN 1 ELSE 0 END) AS present,
                    SUM(CASE WHEN ar.status="absent"  THEN 1 ELSE 0 END) AS absent,
                    SUM(CASE WHEN ar.status="late"    THEN 1 ELSE 0 END) AS late
                 FROM attendance_records ar
                 JOIN attendance_sessions ats ON ats.id = ar.session_id
                 WHERE ar.student_id = ? AND ats.class_id = ? AND ats.school_id = ?'
            );
            $attStmt->execute([$studentId, $classId, $schoolId]);
            $att = $attStmt->fetch();

            return [
                'success' => true,
                'report_card' => [
                    'school'          => $school,
                    'student'         => $student,
                    'class'           => $class,
                    'academic_year'   => $year,
                    'term'            => $term,
                    'seq_labels'      => ["S{$seq1Num}", "S{$seq2Num}"],
                    'subjects'        => $subjectRows,
                    'total_points'    => round($totalPoints, 2),
                    'total_coeff'     => $totalCoeff,
                    'general_avg'     => $generalAvg,
                    'academic_work'   => $generalAvg !== null ? self::academicWork($generalAvg) : '-',
                    'appreciation'    => $generalAvg !== null ? self::appreciation($generalAvg) : '-',
                    'rank'            => $rank,
                    'class_size'      => $classSize,
                    'highest_avg'     => $highestAvg,
                    'lowest_avg'      => $lowestAvg,
                    'class_avg'       => !empty($classAvgs) ? round(array_sum($classAvgs)/count($classAvgs),2) : null,
                    'subjects_sat'    => $subjectsSat,
                    'subjects_passed' => $subjectsPassed,
                    'pass'            => $generalAvg !== null ? $generalAvg >= 10 : null,
                    'term_averages'   => $prevTerms,
                    'annual_avg'      => $annualAvg,
                    'annual_position' => $annualPosition,
                    'attendance'      => [
                        'present' => (int)($att['present'] ?? 0),
                        'absent'  => (int)($att['absent']  ?? 0),
                        'late'    => (int)($att['late']    ?? 0),
                    ],
                ],
            ];

        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to generate report card', 'error' => $e->getMessage()];
        }
    }

    // Class overview - list all students with their term averages
    public static function classOverview(): array
    {
        try {
            Auth::check();
            $classId        = isset($_GET['class_id'])         ? (int)$_GET['class_id']         : 0;
            $academicYearId = isset($_GET['academic_year_id']) ? (int)$_GET['academic_year_id'] : 0;
            $termId         = isset($_GET['term_id'])          ? (int)$_GET['term_id']          : 0;

            if (!$classId || !$academicYearId || !$termId) {
                return ['success' => false, 'message' => 'class_id, academic_year_id and term_id are required'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $stmt = $pdo->prepare('SELECT term_number FROM terms WHERE id = ?');
            $stmt->execute([$termId]);
            $term      = $stmt->fetch();
            $seqMap    = [1 => [1,2], 2 => [3,4], 3 => [5,6]];
            $sequences = $seqMap[$term['term_number'] ?? 1] ?? [1,2];
            $seqIn     = implode(',', $sequences);

            $stmt = $pdo->prepare(
                "SELECT s.id, s.first_name, s.last_name, s.student_number, s.gender,
                        ROUND(SUM(er.score * sub.coefficient) / SUM(sub.coefficient), 2) AS avg,
                        COUNT(DISTINCT er.subject_id) AS subjects_entered
                 FROM student_enrollments se
                 JOIN students s ON s.id = se.student_id
                 LEFT JOIN exam_results er ON er.student_id = se.student_id
                                          AND er.class_id   = se.class_id
                                          AND er.school_id  = se.school_id
                                          AND er.sequence IN ($seqIn)
                 LEFT JOIN subjects sub ON sub.id = er.subject_id
                 WHERE se.class_id = ? AND se.academic_year_id = ?
                   AND se.school_id = ? AND se.status = 'active'
                 GROUP BY s.id
                 ORDER BY s.last_name, s.first_name"
            );
            $stmt->execute([$classId, $academicYearId, $schoolId]);
            $students = $stmt->fetchAll();

            return ['success' => true, 'students' => $students, 'count' => count($students)];

        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to load class overview', 'error' => $e->getMessage()];
        }
    }
}

    // Generate all report cards for a class at once
    public static function generateAll(): array
    {
        try {
            Auth::check();
            $classId        = isset($_GET['class_id'])         ? (int)$_GET['class_id']         : 0;
            $academicYearId = isset($_GET['academic_year_id']) ? (int)$_GET['academic_year_id'] : 0;
            $termId         = isset($_GET['term_id'])          ? (int)$_GET['term_id']          : 0;

            if (!$classId || !$academicYearId || !$termId) {
                return ['success' => false, 'message' => 'class_id, academic_year_id and term_id are required'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            // Get all enrolled students
            $stmt = $pdo->prepare(
                'SELECT s.id FROM student_enrollments se
                 JOIN students s ON s.id = se.student_id
                 WHERE se.class_id = ? AND se.academic_year_id = ?
                   AND se.school_id = ? AND se.status = \'active\'
                 ORDER BY s.last_name, s.first_name'
            );
            $stmt->execute([$classId, $academicYearId, $schoolId]);
            $studentIds = array_column($stmt->fetchAll(), 'id');

            if (empty($studentIds)) {
                return ['success' => false, 'message' => 'No students enrolled in this class'];
            }

            $reportCards = [];
            foreach ($studentIds as $studentId) {
                $_GET['student_id']       = $studentId;
                $_GET['class_id']         = $classId;
                $_GET['academic_year_id'] = $academicYearId;
                $_GET['term_id']          = $termId;
                $result = self::generate();
                if ($result['success']) {
                    $reportCards[] = $result['report_card'];
                }
            }

            return [
                'success'      => true,
                'report_cards' => $reportCards,
                'count'        => count($reportCards),
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to generate all report cards', 'error' => $e->getMessage()];
        }
    }
