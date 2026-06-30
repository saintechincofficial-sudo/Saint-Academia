<?php
require_once __DIR__ . '/../config/database.php';

class ReportController {
    public static function index(): array {
        try {
            $pdo = getDatabaseConnection();

            $schoolId = self::getSchoolId($pdo);
            if ($schoolId === null) {
                return ['success' => true, 'report' => self::emptyReport()];
            }

            $report = [
                'students' => self::countRows($pdo, 'students', $schoolId),
                'staff' => self::countRows($pdo, 'staff', $schoolId),
                'classes' => self::countRows($pdo, 'classes', $schoolId),
                'attendance_sessions' => self::countRows($pdo, 'attendance_sessions', $schoolId),
                'attendance_records' => self::countRows($pdo, 'attendance_records'),
                'fee_invoices' => self::countRows($pdo, 'fee_invoices', $schoolId),
                'exam_results' => self::countRows($pdo, 'exam_results', $schoolId),
                'average_exam_score' => self::avgColumn($pdo, 'exam_results', 'score', $schoolId),
                'total_fees_due' => self::sumColumn($pdo, 'fee_invoices', 'amount_due', $schoolId),
                'total_fees_paid' => self::sumColumn($pdo, 'fee_invoices', 'amount_paid', $schoolId),
                'total_balance' => self::sumColumn($pdo, 'fee_invoices', 'balance', $schoolId),
                'overdue_invoices' => self::countOverdueInvoices($pdo, $schoolId),
            ];

            return ['success' => true, 'report' => $report];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Unable to generate report', 'error' => $e->getMessage()];
        }
    }

    private static function getSchoolId(PDO $pdo): ?int {
        $stmt = $pdo->query('SELECT id FROM schools ORDER BY id LIMIT 1');
        $row = $stmt->fetch();
        return $row ? (int) $row['id'] : null;
    }

    private static function countRows(PDO $pdo, string $table, ?int $schoolId = null): int {
        if ($schoolId === null || !in_array($table, ['students', 'staff', 'classes', 'attendance_sessions', 'fee_invoices'], true)) {
            $stmt = $pdo->query("SELECT COUNT(*) AS total FROM {$table}");
            $row = $stmt->fetch();
            return (int) ($row['total'] ?? 0);
        }

        $stmt = $pdo->prepare("SELECT COUNT(*) AS total FROM {$table} WHERE school_id = :school_id");
        $stmt->execute([':school_id' => $schoolId]);
        $row = $stmt->fetch();
        return (int) ($row['total'] ?? 0);
    }

    private static function sumColumn(PDO $pdo, string $table, string $column, ?int $schoolId = null): float {
        if ($schoolId === null) {
            $stmt = $pdo->query("SELECT SUM({$column}) AS total FROM {$table}");
        } else {
            $stmt = $pdo->prepare("SELECT SUM({$column}) AS total FROM {$table} WHERE school_id = :school_id");
            $stmt->execute([':school_id' => $schoolId]);
        }

        $row = $stmt->fetch();
        return (float) ($row['total'] ?? 0);
    }

    private static function avgColumn(PDO $pdo, string $table, string $column, ?int $schoolId = null): float {
        if ($schoolId === null) {
            $stmt = $pdo->query("SELECT AVG({$column}) AS average FROM {$table}");
        } else {
            $stmt = $pdo->prepare("SELECT AVG({$column}) AS average FROM {$table} WHERE school_id = :school_id");
            $stmt->execute([':school_id' => $schoolId]);
        }

        $row = $stmt->fetch();
        return (float) ($row['average'] ?? 0);
    }

    private static function countOverdueInvoices(PDO $pdo, ?int $schoolId = null): int {
        if ($schoolId === null) {
            $stmt = $pdo->query("SELECT COUNT(*) AS total FROM fee_invoices WHERE due_date < CURDATE() AND status != 'paid'");
        } else {
            $stmt = $pdo->prepare("SELECT COUNT(*) AS total FROM fee_invoices WHERE school_id = :school_id AND due_date < CURDATE() AND status != 'paid'");
            $stmt->execute([':school_id' => $schoolId]);
        }

        $row = $stmt->fetch();
        return (int) ($row['total'] ?? 0);
    }

    private static function emptyReport(): array {
        return [
            'students' => 0,
            'staff' => 0,
            'classes' => 0,
            'attendance_sessions' => 0,
            'attendance_records' => 0,
            'fee_invoices' => 0,
            'total_fees_due' => 0.0,
            'total_fees_paid' => 0.0,
            'total_balance' => 0.0,
        ];
    }
}
