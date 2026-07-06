<?php
require_once __DIR__ . '/../utils/TenantContext.php';

class Student {
    private $pdo;
    private $school_id = 0;

    public function __construct() {
        $this->pdo = getDatabaseConnection();
    }

    private function getSchoolId(): int {
        if ($this->school_id > 0) return $this->school_id;
        $this->school_id = TenantContext::getSchoolId(1) ?? 1;
        return $this->school_id;
    }

    public function getAll($page = 1, $limit = 25) {
        $offset = ($page - 1) * $limit;
        $sql = "SELECT * FROM students WHERE school_id = ?
                ORDER BY last_name ASC, first_name ASC
                LIMIT $limit OFFSET $offset";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId()]);
        return $stmt->fetchAll();
    }

    public function getByClass(int $classId, int $academicYearId, $page = 1, $limit = 100) {
        $offset = ($page - 1) * $limit;
        $sql = "SELECT s.*, se.status AS enrollment_status,
                       c.name AS class_name, ay.label AS academic_year
                FROM students s
                JOIN student_enrollments se ON se.student_id = s.id
                JOIN classes c ON c.id = se.class_id
                JOIN academic_years ay ON ay.id = se.academic_year_id
                WHERE s.school_id = ?
                  AND se.class_id = ?
                  AND se.academic_year_id = ?
                  AND se.status = 'active'
                ORDER BY s.last_name ASC, s.first_name ASC
                LIMIT $limit OFFSET $offset";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId(), $classId, $academicYearId]);
        return $stmt->fetchAll();
    }

    public function getByClassCount(int $classId, int $academicYearId): int {
        $sql = "SELECT COUNT(*) as total
                FROM students s
                JOIN student_enrollments se ON se.student_id = s.id
                WHERE s.school_id = ?
                  AND se.class_id = ?
                  AND se.academic_year_id = ?
                  AND se.status = 'active'";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId(), $classId, $academicYearId]);
        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function searchByClass(string $query, int $classId, int $academicYearId, $page = 1, $limit = 100) {
        $offset = ($page - 1) * $limit;
        $search = "%$query%";
        $sql = "SELECT s.*, se.status AS enrollment_status,
                       c.name AS class_name, ay.label AS academic_year
                FROM students s
                JOIN student_enrollments se ON se.student_id = s.id
                JOIN classes c ON c.id = se.class_id
                JOIN academic_years ay ON ay.id = se.academic_year_id
                WHERE s.school_id = ?
                  AND se.class_id = ?
                  AND se.academic_year_id = ?
                  AND se.status = 'active'
                  AND (s.student_number LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)
                ORDER BY s.last_name ASC, s.first_name ASC
                LIMIT $limit OFFSET $offset";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId(), $classId, $academicYearId, $search, $search, $search]);
        return $stmt->fetchAll();
    }

    public function searchByClassCount(string $query, int $classId, int $academicYearId): int {
        $search = "%$query%";
        $sql = "SELECT COUNT(*) as total
                FROM students s
                JOIN student_enrollments se ON se.student_id = s.id
                WHERE s.school_id = ?
                  AND se.class_id = ?
                  AND se.academic_year_id = ?
                  AND se.status = 'active'
                  AND (s.student_number LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId(), $classId, $academicYearId, $search, $search, $search]);
        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function getById($id) {
        $sql = "SELECT * FROM students WHERE id = ? AND school_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id, $this->getSchoolId()]);
        return $stmt->fetch();
    }

    public function getCount() {
        $sql = "SELECT COUNT(*) as total FROM students WHERE school_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId()]);
        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function findByNumber($student_number) {
        $sql = "SELECT * FROM students WHERE school_id = ? AND student_number = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId(), $student_number]);
        return $stmt->fetch();
    }

    public function search($query, $page = 1, $limit = 25) {
        $offset = ($page - 1) * $limit;
        $search = "%$query%";
        $sql = "SELECT * FROM students
                WHERE school_id = ?
                  AND (student_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)
                ORDER BY last_name ASC, first_name ASC
                LIMIT $limit OFFSET $offset";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId(), $search, $search, $search, $search]);
        return $stmt->fetchAll();
    }

    public function searchCount($query) {
        $search = "%$query%";
        $sql = "SELECT COUNT(*) as total FROM students
                WHERE school_id = ?
                  AND (student_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId(), $search, $search, $search, $search]);
        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function create($data) {
        $errors = $this->validate($data);
        if (!empty($errors)) return ['success' => false, 'errors' => $errors];
        try {
            $sql = "INSERT INTO students
                    (school_id, student_number, first_name, last_name,
                     date_of_birth, gender, phone, email, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $this->getSchoolId(),
                $data['student_number'], $data['first_name'], $data['last_name'],
                $data['date_of_birth'] ?? null, $data['gender'] ?? null,
                $data['phone'] ?? null, $data['email'] ?? null, 'active'
            ]);
            return ['success' => true, 'id' => $this->pdo->lastInsertId(), 'message' => 'Student created successfully'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to create student', 'error' => $e->getMessage()];
        }
    }

    public function update($id, $data) {
        $student = $this->getById($id);
        if (!$student) return ['success' => false, 'message' => 'Student not found'];
        $errors = $this->validate($data, $id);
        if (!empty($errors)) return ['success' => false, 'errors' => $errors];
        try {
            $sql = "UPDATE students
                    SET first_name=?, last_name=?, date_of_birth=?,
                        place_of_birth=?, gender=?, phone=?, email=?,
                        father_name=?, mother_name=?, local_id=?,
                        entry_status=?, status=?
                    WHERE id=? AND school_id=?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $data['first_name'], $data['last_name'],
                $data['date_of_birth'] ?? null,
                $data['place_of_birth'] ?? null,
                $data['gender'] ?? null,
                $data['phone'] ?? null,
                $data['email'] ?? null,
                $data['father_name'] ?? null,
                $data['mother_name'] ?? null,
                $data['local_id'] ?? null,
                $data['entry_status'] ?? 'new',
                $data['status'] ?? 'active',
                $id, $this->getSchoolId()
            ]);
            return ['success' => true, 'message' => 'Student updated successfully'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to update student', 'error' => $e->getMessage()];
        }
    }

    public function delete($id) {
        $student = $this->getById($id);
        if (!$student) return ['success' => false, 'message' => 'Student not found'];
        try {
            $sql = "DELETE FROM students WHERE id=? AND school_id=?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$id, $this->getSchoolId()]);
            return ['success' => true, 'message' => 'Student deleted successfully'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to delete student', 'error' => $e->getMessage()];
        }
    }

    public function validate($data, $edit_id = null) {
        $errors = [];
        if (empty($data['student_number'])) {
            $errors[] = 'Student number is required';
        } else {
            $existing = $this->findByNumber($data['student_number']);
            if ($existing && (!$edit_id || $existing['id'] != $edit_id)) {
                $errors[] = 'Student number already exists';
            }
        }
        if (empty($data['first_name']))  $errors[] = 'First name is required';
        if (empty($data['last_name']))   $errors[] = 'Last name is required';
        if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL))
            $errors[] = 'Invalid email format';
        return $errors;
    }
}
