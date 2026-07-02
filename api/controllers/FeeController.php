<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/SchoolHelper.php';

class FeeController
{
    public static function index(): array
    {
        try {
            Auth::check();
            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $stmt = $pdo->prepare(
                'SELECT
                     fi.id,
                     fi.invoice_number,
                     fi.amount_due,
                     fi.amount_paid,
                     fi.balance,
                     fi.status,
                     fi.invoice_date,
                     fi.due_date,
                     s.first_name,
                     s.last_name,
                     s.student_number
                 FROM fee_invoices fi
                 JOIN students s ON s.id = fi.student_id
                 WHERE fi.school_id = ?
                 ORDER BY fi.id DESC
                 LIMIT 200'
            );
            $stmt->execute([$schoolId]);

            return ['success' => true, 'fees' => $stmt->fetchAll()];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to load fees',
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

            $studentId     = (int)   ($body['student_id']     ?? 0);
            $amountDue     = (float) ($body['amount_due']     ?? 0);
            $invoiceNumber = trim((string) ($body['invoice_number'] ?? ''));
            $invoiceDate   = trim((string) ($body['invoice_date']   ?? date('Y-m-d')));
            $dueDate       = trim((string) ($body['due_date']       ?? date('Y-m-d', strtotime('+30 days'))));

            if ($studentId <= 0) {
                return ['success' => false, 'message' => 'Student ID is required'];
            }
            if ($amountDue <= 0) {
                return ['success' => false, 'message' => 'Amount due must be greater than zero'];
            }

            if ($invoiceNumber === '') {
                $invoiceNumber = 'INV-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
            }

            $pdo            = getDatabaseConnection();
            $schoolId       = SchoolHelper::resolveSchoolId($pdo);
            $academicYearId = SchoolHelper::resolveAcademicYearId($pdo, $schoolId);

            $studentCheck = $pdo->prepare('SELECT id FROM students WHERE id = ? AND school_id = ?');
            $studentCheck->execute([$studentId, $schoolId]);
            if (!$studentCheck->fetch()) {
                return ['success' => false, 'message' => 'Student not found in this school'];
            }

            $stmt = $pdo->prepare(
                'INSERT INTO fee_invoices
                 (school_id, student_id, academic_year_id, invoice_number,
                  amount_due, amount_paid, balance, invoice_date, due_date, status)
                 VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, \'unpaid\')'
            );
            $stmt->execute([
                $schoolId, $studentId, $academicYearId, $invoiceNumber,
                $amountDue, $amountDue, $invoiceDate, $dueDate,
            ]);

            return [
                'success' => true,
                'message' => 'Invoice created',
                'fee'     => [
                    'id'             => (int) $pdo->lastInsertId(),
                    'invoice_number' => $invoiceNumber,
                    'amount_due'     => $amountDue,
                    'amount_paid'    => 0,
                    'balance'        => $amountDue,
                    'status'         => 'unpaid',
                ],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to create invoice',
                'error'   => $e->getMessage(),
            ];
        }
    }

    public static function pay(): array
    {
        try {
            Auth::check();

            $body = json_decode(file_get_contents('php://input'), true);
            if (!is_array($body) || empty($body)) {
                $body = $_POST ?: [];
            }

            $invoiceId     = (int)   ($body['invoice_id']     ?? 0);
            $paymentAmount = (float) ($body['payment_amount'] ?? 0);

            if ($invoiceId <= 0) {
                return ['success' => false, 'message' => 'Invoice ID is required'];
            }
            if ($paymentAmount <= 0) {
                return ['success' => false, 'message' => 'Payment amount must be greater than zero'];
            }

            $pdo      = getDatabaseConnection();
            $schoolId = SchoolHelper::resolveSchoolId($pdo);

            $stmt = $pdo->prepare(
                'SELECT id, amount_due, amount_paid, balance, status
                 FROM fee_invoices
                 WHERE id = ? AND school_id = ?'
            );
            $stmt->execute([$invoiceId, $schoolId]);
            $invoice = $stmt->fetch();

            if (!$invoice) {
                return ['success' => false, 'message' => 'Invoice not found'];
            }
            if ($invoice['status'] === 'paid') {
                return ['success' => false, 'message' => 'This invoice is already fully paid'];
            }

            $newPaid    = (float) $invoice['amount_paid'] + $paymentAmount;
            $newBalance = max(0.0, (float) $invoice['amount_due'] - $newPaid);
            $status     = $newBalance <= 0 ? 'paid' : 'partial';

            $update = $pdo->prepare(
                'UPDATE fee_invoices
                 SET amount_paid = ?, balance = ?, status = ?
                 WHERE id = ? AND school_id = ?'
            );
            $update->execute([$newPaid, $newBalance, $status, $invoiceId, $schoolId]);

            return [
                'success' => true,
                'message' => 'Payment applied',
                'invoice' => [
                    'id'          => $invoiceId,
                    'amount_paid' => $newPaid,
                    'balance'     => $newBalance,
                    'status'      => $status,
                ],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to apply payment',
                'error'   => $e->getMessage(),
            ];
        }
    }
}
