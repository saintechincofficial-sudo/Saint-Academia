<?php
require_once __DIR__ . '/../config/database.php';

class ResultController {
    public static function index(): array {
        try {
            $pdo = getDatabaseConnection();
            $stmt = $pdo->query(
                'SELECT r.id, r.exam_type, r.score, r.max_score, r.grade, r.remarks, r.created_at,
                        s.first_name AS student_first_name, s.last_name AS student_last_name,
                        sub.name AS subject_name, c.name AS class_name, t.label AS term_label
                 FROM exam_results r
                 JOIN students s ON s.id = r.student_id
                 JOIN subjects sub ON sub.id = r.subject_id
                 JOIN classes c ON c.id = r.class_id
                 JOIN terms t ON t.id = r.term_id
                 ORDER BY r.id DESC
                 LIMIT 100'
            );

            return [
                'success' => true,
                'results' => $stmt->fetchAll(),
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to load exam results',
                'error' => $e->getMessage(),
            ];
        }
    }

    public static function create(): array {
        $rawBody = file_get_contents('php://input');
        $body = [];

        if (!empty($rawBody)) {
            $decodedJson = json_decode($rawBody, true);
            if (is_array($decodedJson)) {
                $body = $decodedJson;
            } else {
                parse_str($rawBody, $body);
            }
        }

        if ($body === []) {
            $body = $_POST;
        }

        $studentId = (int) ($body['student_id'] ?? 0);
        $subjectId = (int) ($body['subject_id'] ?? 0);
        $classId = (int) ($body['class_id'] ?? 0);
        $termId = (int) ($body['term_id'] ?? 0);
        $examType = trim((string) ($body['exam_type'] ?? 'Test'));
        $score = (float) ($body['score'] ?? 0);
        $maxScore = (float) ($body['max_score'] ?? 100);
        $remarks = trim((string) ($body['remarks'] ?? ''));

        if ($studentId <= 0 || $subjectId <= 0 || $classId <= 0 || $termId <= 0) {
            return ['success' => false, 'message' => 'Student, subject, class and term are required'];
        }

        if ($maxScore <= 0) {
            return ['success' => false, 'message' => 'Max score must be greater than zero'];
        }

        $grade = self::calculateGrade($score, $maxScore);

        try {
            $pdo = getDatabaseConnection();
            $schoolId = self::ensureSchool();

            $stmt = $pdo->prepare(
                'INSERT INTO exam_results (school_id, student_id, subject_id, class_id, term_id, exam_type, score, max_score, grade, remarks, created_at)
                 VALUES (:school_id, :student_id, :subject_id, :class_id, :term_id, :exam_type, :score, :max_score, :grade, :remarks, NOW())'
            );
            $stmt->execute([
                ':school_id' => $schoolId,
                ':student_id' => $studentId,
                ':subject_id' => $subjectId,
                ':class_id' => $classId,
                ':term_id' => $termId,
                ':exam_type' => $examType,
                ':score' => $score,
                ':max_score' => $maxScore,
                ':grade' => $grade,
                ':remarks' => $remarks,
            ]);

            return [
                'success' => true,
                'message' => 'Exam result recorded successfully',
                'result' => [
                    'id' => (int) $pdo->lastInsertId(),
                    'student_id' => $studentId,
                    'subject_id' => $subjectId,
                    'class_id' => $classId,
                    'term_id' => $termId,
                    'exam_type' => $examType,
                    'score' => $score,
                    'max_score' => $maxScore,
                    'grade' => $grade,
                    'remarks' => $remarks,
                ],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to record exam result',
                'error' => $e->getMessage(),
            ];
        }
    }

    private static function calculateGrade(float $score, float $maxScore): string {
        $percentage = $maxScore > 0 ? ($score / $maxScore) * 100 : 0;
        if ($percentage >= 80) {
            return 'A';
        }
        if ($percentage >= 70) {
            return 'B';
        }
        if ($percentage >= 60) {
            return 'C';
        }
        if ($percentage >= 50) {
            return 'D';
        }
        return 'F';
    }

    private static function ensureSchool(): int {
        $pdo = getDatabaseConnection();
        $stmt = $pdo->query('SELECT id FROM schools ORDER BY id LIMIT 1');
        $school = $stmt->fetch();

        if ($school) {
            return (int) $school['id'];
        }

        $pdo->prepare('INSERT INTO schools (name, email) VALUES (?, ?)')->execute([
            'SaintAcademia',
            'info@saintacademia.com',
        ]);

        return (int) $pdo->lastInsertId();
    }
}
