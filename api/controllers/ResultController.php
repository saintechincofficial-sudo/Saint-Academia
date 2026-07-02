<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/SchoolHelper.php';

class ResultController
{
    private static function cameroonGrade(float $score): string
    {
        if ($score >= 18) return 'A+';
        if ($score >= 16) return 'A';
        if ($score >= 14) return 'B+';
        if ($score >= 12) return 'B';
        if ($score >= 10) return 'C';
        if ($score >= 8)  return 'D';
        return 'F';
    }

    private static function cameroonRemarks(float $score): string
    {
        if ($score >= 18) return 'Excellent';
        if ($score >= 16) return 'Tres Bien';
        if ($score >= 14) return 'Bien';
        if ($score >= 12) return 'Assez Bien';
        if ($score >= 10) return 'Passable';
        if ($score >= 8)  return 'Insuffisant';
        return 'Tres Insuffisant';
    }

    public static function index(): array
    {
        try {
            Auth::check();
            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $classId = isset($_GET['class_id']) ? (int) $_GET['class_id'] : null;
            $termId  = isset($_GET['term_id'])  ? (int) $_GET['term_id']  : null;
            $seqId   = isset($_GET['sequence']) ? (int) $_GET['sequence'] : null;

            $where  = ['r.school_id = ?'];
            $params = [$schoolId];

            if ($classId) { $where[] = 'r.class_id = ?';  $params[] = $classId; }
            if ($termId)  { $where[] = 'r.term_id = ?';   $params[] = $termId;  }
            if ($seqId)   { $where[] = 'r.sequence = ?';  $params[] = $seqId;   }

            $whereClause = implode(' AND ', $where);

            $stmt = $pdo->prepare(
                "SELECT
                     r.id,
                     r.score,
                     r.max_score,
                     r.grade,
                     r.remarks,
                     r.exam_type,
                     r.sequence,
                     r.created_at,
                     CONCAT(s.first_name, ' ', s.last_name) AS student_name,
                     s.student_number,
                     sub.name        AS subject_name,
                     sub.coefficient AS coefficient,
                     c.name          AS class_name,
                     t.label         AS term_label
                 FROM exam_results r
                 JOIN students s   ON s.id   = r.student_id
                 JOIN subjects sub ON sub.id  = r.subject_id
                 JOIN classes  c   ON c.id    = r.class_id
                 JOIN terms    t   ON t.id    = r.term_id
                 WHERE {$whereClause}
                 ORDER BY c.name, sub.name, s.last_name, r.sequence
                 LIMIT 500"
            );
            $stmt->execute($params);

            return ['success' => true, 'results' => $stmt->fetchAll()];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to load results',
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

            $studentId = (int)   ($body['student_id'] ?? 0);
            $subjectId = (int)   ($body['subject_id'] ?? 0);
            $classId   = (int)   ($body['class_id']   ?? 0);
            $termId    = (int)   ($body['term_id']     ?? 0);
            $examType  = trim((string) ($body['exam_type'] ?? 'Evaluation'));
            $score     = (float) ($body['score']       ?? -1);
            $maxScore  = (float) ($body['max_score']   ?? 20);
            $sequence  = isset($body['sequence']) ? (int) $body['sequence'] : null;
            $remarks   = trim((string) ($body['remarks'] ?? ''));

            if ($studentId <= 0 || $subjectId <= 0 || $classId <= 0 || $termId <= 0) {
                return ['success' => false, 'message' => 'student_id, subject_id, class_id and term_id are required'];
            }
            if ($score < 0 || $score > $maxScore) {
                return ['success' => false, 'message' => "Score must be between 0 and {$maxScore}"];
            }
            if ($maxScore <= 0) {
                return ['success' => false, 'message' => 'max_score must be greater than zero'];
            }

            $scorePer20 = ($maxScore != 20) ? ($score / $maxScore) * 20 : $score;
            $grade      = self::cameroonGrade($scorePer20);
            if ($remarks === '') {
                $remarks = self::cameroonRemarks($scorePer20);
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $stmt = $pdo->prepare(
                'INSERT INTO exam_results
                 (school_id, student_id, subject_id, class_id, term_id,
                  exam_type, score, max_score, grade, remarks, sequence, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE
                     score     = VALUES(score),
                     grade     = VALUES(grade),
                     remarks   = VALUES(remarks),
                     exam_type = VALUES(exam_type)'
            );
            $stmt->execute([
                $schoolId, $studentId, $subjectId, $classId, $termId,
                $examType, $score, $maxScore, $grade, $remarks, $sequence,
            ]);

            return [
                'success' => true,
                'message' => 'Result recorded',
                'result'  => [
                    'id'          => (int) $pdo->lastInsertId(),
                    'student_id'  => $studentId,
                    'subject_id'  => $subjectId,
                    'score'       => $score,
                    'max_score'   => $maxScore,
                    'score_per20' => round($scorePer20, 2),
                    'grade'       => $grade,
                    'remarks'     => $remarks,
                    'sequence'    => $sequence,
                ],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to record result',
                'error'   => $e->getMessage(),
            ];
        }
    }
}
