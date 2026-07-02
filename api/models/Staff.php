<?php

class Staff {
    private $pdo;
    private $school_id = 1;

    public function __construct() {
        $this->pdo = getDatabaseConnection();
    }

    public function getAll($page = 1, $limit = 25) {
        $offset = ($page - 1) * $limit;
        $limit = (int) $limit;
        $offset = (int) $offset;

        $sql = "SELECT * FROM staff WHERE school_id = ? ORDER BY created_at DESC LIMIT $limit OFFSET $offset";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->school_id]);

        return $stmt->fetchAll();
    }

    public function getById($id) {
        $sql = "SELECT * FROM staff WHERE id = ? AND school_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id, $this->school_id]);
        return $stmt->fetch();
    }

    public function getCount() {
        $sql = "SELECT COUNT(*) as total FROM staff WHERE school_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->school_id]);
        $result = $stmt->fetch();
        return $result['total'] ?? 0;
    }

    public function findByNumber($staff_number) {
        $sql = "SELECT * FROM staff WHERE school_id = ? AND staff_number = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->school_id, $staff_number]);
        return $stmt->fetch();
    }

    public function search($query, $page = 1, $limit = 25) {
        $offset = ($page - 1) * $limit;
        $limit = (int) $limit;
        $offset = (int) $offset;
        $search = "%$query%";

        $sql = "SELECT * FROM staff WHERE school_id = ? AND (staff_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR role LIKE ? OR department LIKE ?) ORDER BY created_at DESC LIMIT $limit OFFSET $offset";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->school_id, $search, $search, $search, $search, $search, $search]);

        return $stmt->fetchAll();
    }

    public function searchCount($query) {
        $search = "%$query%";
        $sql = "SELECT COUNT(*) as total FROM staff WHERE school_id = ? AND (staff_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR role LIKE ? OR department LIKE ?)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->school_id, $search, $search, $search, $search, $search, $search]);
        $result = $stmt->fetch();
        return $result['total'] ?? 0;
    }

    public function create($data) {
        $errors = $this->validate($data);
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }

        try {
            $sql = "INSERT INTO staff (school_id, staff_number, first_name, last_name, role, department, email, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $this->school_id,
                $data['staff_number'],
                $data['first_name'],
                $data['last_name'],
                $data['role'] ?? 'Teacher',
                $data['department'] ?? null,
                $data['email'] ?? null,
                $data['phone'] ?? null,
                'active'
            ]);

            return ['success' => true, 'id' => $this->pdo->lastInsertId(), 'message' => 'Staff member created successfully'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to create staff member', 'error' => $e->getMessage()];
        }
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
                $this->school_id
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
            $stmt->execute([$id, $this->school_id]);
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

        if (!empty($data['role']) && !in_array($data['role'], $this->availableRoles(), true)) {
            $errors[] = 'Invalid staff role';
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
