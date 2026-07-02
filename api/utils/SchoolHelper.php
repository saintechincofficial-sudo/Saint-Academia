<?php
require_once __DIR__ . '/TenantContext.php';

class SchoolHelper
{
    public static function resolveSchoolId(PDO $pdo): int
    {
        $schoolId = TenantContext::getSchoolId();
        if ($schoolId !== null && $schoolId > 0) {
            return $schoolId;
        }

        $stmt = $pdo->query('SELECT id FROM schools ORDER BY id ASC LIMIT 1');
        $row  = $stmt->fetch();

        if ($row) {
            return (int) $row['id'];
        }

        $pdo->prepare('INSERT INTO schools (name, email, is_active) VALUES (?, ?, ?)')
            ->execute(['SaintAcademia', 'info@saintacademia.com', 1]);

        return (int) $pdo->lastInsertId();
    }

    public static function resolveAcademicYearId(PDO $pdo, int $schoolId): int
    {
        $stmt = $pdo->prepare(
            'SELECT id FROM academic_years
             WHERE school_id = ? AND is_current = 1
             ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute([$schoolId]);
        $row = $stmt->fetch();
        if ($row) return (int) $row['id'];

        $stmt = $pdo->prepare(
            'SELECT id FROM academic_years
             WHERE school_id = ?
             ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute([$schoolId]);
        $row = $stmt->fetch();
        if ($row) return (int) $row['id'];

        $label     = date('Y') . '/' . (date('Y') + 1);
        $startDate = date('Y-m-d');
        $endDate   = date('Y-m-d', strtotime('+1 year'));

        $stmt = $pdo->prepare(
            'INSERT INTO academic_years
             (school_id, label, start_date, end_date, is_current)
             VALUES (?, ?, ?, ?, 1)'
        );
        $stmt->execute([$schoolId, $label, $startDate, $endDate]);

        return (int) $pdo->lastInsertId();
    }
}
