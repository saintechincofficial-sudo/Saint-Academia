<?php
require_once __DIR__ . '/../utils/TenantContext.php';

class Staff {
    private $pdo;
    private $school_id = 0;

    public function __construct() {
        $this->pdo = getDatabaseConnection();
    }

    private function getSchoolId(): int {
        if ($this->school_id > 0) {
            return $this->school_id;
        }

        $this->school_id = TenantContext::getSchoolId(1) ?? 1;
        return $this->school_id;
    }

    public function getAll($page = 1, $limit = 25) {
        $offset = ($page - 1) * $limit;
        $limit = (int) $limit;
        $offset = (int) $offset;

        $sql = "SELECT * FROM staff WHERE school_id = ? ORDER BY created_at DESC LIMIT $limit OFFSET $offset";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId()]);

        return $stmt->fetchAll();
    }

    public function getById($id) {
        $sql = "SELECT * FROM staff WHERE id = ? AND school_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id, $this->getSchoolId()]);
        return $stmt->fetch();
    }

    public function getCount() {
        $sql = "SELECT COUNT(*) as total FROM staff WHERE school_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId()]);
        $result = $stmt->fetch();
        return $result['total'] ?? 0;
    }

    public function findByNumber($staff_number) {
        $sql = "SELECT * FROM staff WHERE school_id = ? AND staff_number = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId(), $staff_number]);
        return $stmt->fetch();
    }

    public function search($query, $page = 1, $limit = 25) {
        $offset = ($page - 1) * $limit;
        $limit = (int) $limit;
        $offset = (int) $offset;
        $search = "%$query%";

        $sql = "SELECT * FROM staff WHERE school_id = ? AND (staff_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR role LIKE ? OR department LIKE ?) ORDER BY created_at DESC LIMIT $limit OFFSET $offset";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId(), $search, $search, $search, $search, $search, $search]);

        return $stmt->fetchAll();
    }

    public function searchCount($query) {
        $search = "%$query%";
        $sql = "SELECT COUNT(*) as total FROM staff WHERE school_id = ? AND (staff_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR role LIKE ? OR department LIKE ?)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->getSchoolId(), $search, $search, $search, $search, $search, $search]);
        $result = $stmt->fetch();
        return $result['total'] ?? 0;
    }

    public function create($data) {
        $errors = $this->validate($data);
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }

        try {
            $this->pdo->beginTransaction();

            $sql = "INSERT INTO staff (school_id, staff_number, first_name, last_name, role, department, email, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $this->getSchoolId(),
                $data['staff_number'],
                $data['first_name'],
                $data['last_name'],
                $data['role'] ?? 'Teacher',
                $data['department'] ?? null,
                $data['email'] ?? null,
                $data['phone'] ?? null,
                'active'
            ]);

            $staffId = (int) $this->pdo->lastInsertId();
            $userEmail = $this->prepareUserEmail($data['email'] ?? '', $staffId, $data['staff_number']);

            $userStmt = $this->pdo->prepare('INSERT INTO users (school_id, email, password_hash, role, is_active, reference_id) VALUES (?, ?, ?, ?, ?, ?)');
            $userStmt->execute([
                $this->getSchoolId(),
                $userEmail,
                password_hash('temp-password', PASSWORD_BCRYPT),
                'staff',
                true,
                $staffId
            ]);

            $userId = (int) $this->pdo->lastInsertId();
            $passwordHash = password_hash((string) $userId, PASSWORD_BCRYPT);
            $updateStmt = $this->pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
            $updateStmt->execute([$passwordHash, $userId]);

            $this->pdo->commit();

            return [
                'success' => true,
                'id' => $staffId,
                'login_id' => $userId,
                'message' => 'Staff member created successfully',
            ];
        } catch (Exception $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            return ['success' => false, 'message' => 'Failed to create staff member', 'error' => $e->getMessage()];
        }
    }

    private function prepareUserEmail($email, $staffId, $staffNumber) {
        $email = trim($email);
        if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $email;
        }

        $identifier = trim($staffNumber) ?: $staffId;
        return sprintf('staff-%s@school-%s.local', $identifier, $this->getSchoolId());
    }

    public function update($id, $data) {
        $staff = $this->getById($id);
        if (!$staff) {
            return ['success' => false, 'message' => 'Staff member not found'];
        }

        $errors = $this->validate($data, $id);
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }

        try {
            $sql = "UPDATE staff SET first_name = ?, last_name = ?, role = ?, department = ?, email = ?, phone = ?, status = ? WHERE id = ? AND school_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $data['first_name'],
                $data['last_name'],
                $data['role'] ?? 'Teacher',
                $data['department'] ?? null,
                $data['email'] ?? null,
                $data['phone'] ?? null,
                $data['status'] ?? 'active',
                $id,
                $this->getSchoolId()
            ]);

            return ['success' => true, 'message' => 'Staff member updated successfully'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to update staff member', 'error' => $e->getMessage()];
        }
    }

    public function delete($id) {
        $staff = $this->getById($id);
        if (!$staff) {
            return ['success' => false, 'message' => 'Staff member not found'];
        }

        try {
            $sql = "DELETE FROM staff WHERE id = ? AND school_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$id, $this->getSchoolId()]);
            return ['success' => true, 'message' => 'Staff member deleted successfully'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to delete staff member', 'error' => $e->getMessage()];
        }
    }

    public function validate($data, $edit_id = null) {
        $errors = [];

        if (empty($data['staff_number'])) {
            $errors[] = 'Staff number is required';
        } else {
            $existing = $this->findByNumber($data['staff_number']);
            if ($existing && (!$edit_id || $existing['id'] != $edit_id)) {
                $errors[] = 'Staff number already exists';
            }
        }

        if (empty($data['first_name'])) {
            $errors[] = 'First name is required';
        }

        if (empty($data['last_name'])) {
            $errors[] = 'Last name is required';
        }


        if (!empty($data['department']) && !in_array($data['department'], $this->availableDepartments(), true)) {
            $errors[] = 'Invalid department selection';
        }

        if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Invalid email format';
        }

        if (!empty($data['phone']) && !preg_match('/^[0-9\-\+\s\(\)]+$/', $data['phone'])) {
            $errors[] = 'Invalid phone number format';
        }

        return $errors;
    }

    public function availableRoles() {
        return ['Teacher', 'Administrator', 'Counselor', 'Support', 'Accountant', 'Librarian'];
    }

    public function availableDepartments() {
        return ['Administration', 'Academics', 'Finance', 'Support', 'Admissions', 'Exams'];
    }
}
