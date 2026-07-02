<?php
require_once __DIR__ . '/../utils/TenantContext.php';

class ClassModel {
    private $pdo;
    private $school_id = 0;

    public function __construct() {
        $this->pdo = getDatabaseConnection();
    }

    private function getSchoolId(): int {
        if ($this->school_id > 0) {
            return $this->school_id;
        }

        $tenantSchoolId = TenantContext::getSchoolId(null);
        if ($tenantSchoolId && $tenantSchoolId > 0) {
            $this->school_id = $tenantSchoolId;
            return $this->school_id;
        }

        $this->school_id = $this->ensureSchool();
        return $this->school_id;
    }

    public function getAll($page = 1, $limit = 25) {
        $schoolId = $this->getSchoolId();
        $offset = ($page - 1) * $limit;
        $limit = (int) $limit;
        $offset = (int) $offset;

        $sql = "SELECT c.id, c.name, c.stream, c.room, cl.name as level_name, ay.label as academic_year
                FROM classes c
                LEFT JOIN class_levels cl ON cl.id = c.level_id
                LEFT JOIN academic_years ay ON ay.id = c.academic_year_id
                WHERE c.school_id = ?
                ORDER BY c.created_at DESC, c.id DESC
                LIMIT $limit OFFSET $offset";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$schoolId]);
        return $stmt->fetchAll();
    }

    public function getById($id) {
        $schoolId = $this->getSchoolId();
        $sql = "SELECT c.id, c.name, c.stream, c.room, cl.name as level_name, ay.label as academic_year
                FROM classes c
                LEFT JOIN class_levels cl ON cl.id = c.level_id
                LEFT JOIN academic_years ay ON ay.id = c.academic_year_id
                WHERE c.id = ? AND c.school_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id, $schoolId]);
        return $stmt->fetch();
    }

    public function getCount() {
        $schoolId = $this->getSchoolId();
        $sql = "SELECT COUNT(*) as total FROM classes WHERE school_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$schoolId]);
        $result = $stmt->fetch();
        return $result['total'] ?? 0;
    }

    public function search($query, $page = 1, $limit = 25) {
        $schoolId = $this->getSchoolId();
        $offset = ($page - 1) * $limit;
        $limit = (int) $limit;
        $offset = (int) $offset;
        $search = "%$query%";

        $sql = "SELECT c.id, c.name, c.stream, c.room, cl.name as level_name, ay.label as academic_year
                FROM classes c
                LEFT JOIN class_levels cl ON cl.id = c.level_id
                LEFT JOIN academic_years ay ON ay.id = c.academic_year_id
                WHERE c.school_id = ? AND (c.name LIKE ? OR c.stream LIKE ? OR c.room LIKE ? OR cl.name LIKE ?)
                ORDER BY c.created_at DESC, c.id DESC
                LIMIT $limit OFFSET $offset";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$schoolId, $search, $search, $search, $search]);
        return $stmt->fetchAll();
    }

    public function searchCount($query) {
        $schoolId = $this->getSchoolId();
        $search = "%$query%";
        $sql = "SELECT COUNT(*) as total FROM classes c
                LEFT JOIN class_levels cl ON cl.id = c.level_id
                WHERE c.school_id = ? AND (c.name LIKE ? OR c.stream LIKE ? OR c.room LIKE ? OR cl.name LIKE ?)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$schoolId, $search, $search, $search, $search]);
        $result = $stmt->fetch();
        return $result['total'] ?? 0;
    }

    public function create($data) {
        $errors = $this->validate($data);
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }

        try {
            $schoolId = $this->getSchoolId();
            $levelId = $this->ensureLevel($schoolId, $data['level_name'] ?? null);
            $academicYearId = $this->ensureAcademicYear($schoolId);

            $sql = "INSERT INTO classes (school_id, level_id, name, stream, academic_year_id, room) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $schoolId,
                $levelId,
                $data['name'],
                $data['stream'] ?? null,
                $academicYearId,
                $data['room'] ?? null
            ]);

            return ['success' => true, 'id' => $this->pdo->lastInsertId(), 'message' => 'Class created successfully'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to create class', 'error' => $e->getMessage()];
        }
    }

    public function update($id, $data) {
        $class = $this->getById($id);
        if (!$class) {
            return ['success' => false, 'message' => 'Class not found'];
        }

        $errors = $this->validate($data, $id);
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }

        try {
            $schoolId = $this->getSchoolId();
            $levelId = $this->ensureLevel($schoolId, $data['level_name'] ?? null);
            $academicYearId = $this->ensureAcademicYear($schoolId);

            $sql = "UPDATE classes SET name = ?, stream = ?, level_id = ?, academic_year_id = ?, room = ? WHERE id = ? AND school_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $data['name'],
                $data['stream'] ?? null,
                $levelId,
                $academicYearId,
                $data['room'] ?? null,
                $id,
                $schoolId
            ]);

            return ['success' => true, 'message' => 'Class updated successfully'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to update class', 'error' => $e->getMessage()];
        }
    }

    public function delete($id) {
        $class = $this->getById($id);
        if (!$class) {
            return ['success' => false, 'message' => 'Class not found'];
        }

        try {
            $schoolId = $this->getSchoolId();
            $sql = "DELETE FROM classes WHERE id = ? AND school_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$id, $schoolId]);
            return ['success' => true, 'message' => 'Class deleted successfully'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to delete class', 'error' => $e->getMessage()];
        }
    }

    public function validate($data, $edit_id = null) {
        $errors = [];
        if (empty($data['name'])) {
            $errors[] = 'Class name is required';
        }
        if (!empty($data['room']) && strlen($data['room']) > 50) {
            $errors[] = 'Room name is too long';
        }
        return $errors;
    }

    private function ensureSchool(): int {
        $stmt = $this->pdo->query('SELECT id FROM schools ORDER BY id LIMIT 1');
        $school = $stmt->fetch();

        if ($school) {
            return (int) $school['id'];
        }

        $this->pdo->prepare('INSERT INTO schools (name, email) VALUES (?, ?)')->execute([
            'SaintAcademia',
            'info@saintacademia.com'
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    private function ensureLevel($schoolId, $levelName = null): int {
        $stmt = $this->pdo->prepare('SELECT id FROM class_levels WHERE school_id = ? ORDER BY id LIMIT 1');
        $stmt->execute([$schoolId]);
        $level = $stmt->fetch();

        if ($level) {
            return (int) $level['id'];
        }

        $name = $levelName ?: 'Secondary';
        $stmt = $this->pdo->prepare('INSERT INTO class_levels (school_id, name, name_fr, order_no) VALUES (?, ?, ?, ?)');
        $stmt->execute([$schoolId, $name, $name, 1]);

        return (int) $this->pdo->lastInsertId();
    }

    private function ensureAcademicYear($schoolId): int {
        $stmt = $this->pdo->prepare('SELECT id FROM academic_years WHERE school_id = ? ORDER BY id DESC LIMIT 1');
        $stmt->execute([$schoolId]);
        $year = $stmt->fetch();

        if ($year) {
            return (int) $year['id'];
        }

        $stmt = $this->pdo->prepare('INSERT INTO academic_years (school_id, label, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$schoolId, '2026/2027', date('Y-m-d'), date('Y-m-d', strtotime('+1 year')), 1]);

        return (int) $this->pdo->lastInsertId();
    }
}
