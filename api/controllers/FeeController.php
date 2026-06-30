<?php
require_once __DIR__ . '/../config/database.php';

class FeeController {
    public static function index(): array {
        try {
            $pdo = getDatabaseConnection();
            $stmt = $pdo->query(
                'SELECT fi.id, fi.invoice_number, fi.amount_due, fi.amount_paid, fi.balance, fi.status, s.first_name, s.last_name FROM fee_invoices fi JOIN students s ON s.id = fi.student_id ORDER BY fi.id DESC LIMIT 100'
            );

            return [
                'success' => true,
                'fees' => $stmt->fetchAll(),
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to load fees',
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
        $amountDue = (float) ($body['amount_due'] ?? 0);
        $invoiceNumber = trim((string) ($body['invoice_number'] ?? 'INV-' . date('YmdHis')));

        if ($studentId <= 0 || $amountDue <= 0) {
            return ['success' => false, 'message' => 'Student and amount due are required'];
        }

        try {
            $pdo = getDatabaseConnection();
            $schoolId = self::ensureSchool();
            $academicYearId = self::ensureAcademicYear($pdo, $schoolId);

            $stmt = $pdo->prepare(
                'INSERT INTO fee_invoices (school_id, student_id, academic_year_id, invoice_number, amount_due, amount_paid, balance, invoice_date, due_date, status)
                 VALUES (:school_id, :student_id, :academic_year_id, :invoice_number, :amount_due, 0, :balance, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), :status)'
            );

            $stmt->execute([
                ':school_id' => $schoolId,
                ':student_id' => $studentId,
                ':academic_year_id' => $academicYearId,
                ':invoice_number' => $invoiceNumber,
                ':amount_due' => $amountDue,
                ':balance' => $amountDue,
                ':status' => 'unpaid',
            ]);

            return [
                'success' => true,
                'message' => 'Invoice created successfully',
                'fee' => [
                    'id' => (int) $pdo->lastInsertId(),
                    'invoice_number' => $invoiceNumber,
                    'amount_due' => $amountDue,
                    'amount_paid' => 0,
                    'balance' => $amountDue,
                    'status' => 'unpaid',
                ],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to create invoice',
                'error' => $e->getMessage(),
            ];
        }
    }

    public static function pay(): array {
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

        $invoiceId = (int) ($body['invoice_id'] ?? 0);
        $paymentAmount = (float) ($body['payment_amount'] ?? 0);

        if ($invoiceId <= 0 || $paymentAmount <= 0) {
            return ['success' => false, 'message' => 'Invoice ID and payment amount are required'];
        }

        try {
            $pdo = getDatabaseConnection();
            $stmt = $pdo->prepare('SELECT amount_due, amount_paid, balance FROM fee_invoices WHERE id = :id');
            $stmt->execute([':id' => $invoiceId]);
            $invoice = $stmt->fetch();

            if (!$invoice) {
                return ['success' => false, 'message' => 'Invoice not found'];
            }

            $newPaid = (float) $invoice['amount_paid'] + $paymentAmount;
            $newBalance = max(0, (float) $invoice['amount_due'] - $newPaid);
            $status = $newBalance <= 0 ? 'paid' : 'partial';

            $update = $pdo->prepare(
                'UPDATE fee_invoices SET amount_paid = :amount_paid, balance = :balance, status = :status WHERE id = :id'
            );
            $update->execute([
                ':amount_paid' => $newPaid,
                ':balance' => $newBalance,
                ':status' => $status,
                ':id' => $invoiceId,
            ]);

            return [
                'success' => true,
                'message' => 'Payment applied successfully',
                'invoice' => [
                    'id' => $invoiceId,
                    'amount_paid' => $newPaid,
                    'balance' => $newBalance,
                    'status' => $status,
                ],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to apply payment',
                'error' => $e->getMessage(),
            ];
        }
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

    private static function ensureAcademicYear(PDO $pdo, int $schoolId): int {
        $stmt = $pdo->prepare('SELECT id FROM academic_years WHERE school_id = ? ORDER BY id DESC LIMIT 1');
        $stmt->execute([$schoolId]);
        $year = $stmt->fetch();

        if ($year) {
            return (int) $year['id'];
        }

        $stmt = $pdo->prepare('INSERT INTO academic_years (school_id, label, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$schoolId, '2026/2027', date('Y-m-d'), date('Y-m-d', strtotime('+1 year')), 1]);

        return (int) $pdo->lastInsertId();
    }
}
