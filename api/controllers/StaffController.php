<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Staff.php';

class StaffController {
    public static function index(): array {
        try {
            $model = new Staff();
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 25;
            $search = isset($_GET['search']) ? trim($_GET['search']) : '';

            if (!empty($search)) {
                $staff = $model->search($search, $page, $limit);
                $total = $model->searchCount($search);
            } else {
                $staff = $model->getAll($page, $limit);
                $total = $model->getCount();
            }

            $pages = $limit > 0 ? (int) ceil($total / $limit) : 1;

            return [
                'success' => true,
                'staff' => $staff,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $pages,
                    'total_items' => $total,
                    'per_page' => $limit,
                ],
            ];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch staff', 'error' => $e->getMessage()];
        }
    }

    public static function show(): array {
        try {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Staff ID is required'];
            }

            $model = new Staff();
            $staff = $model->getById($id);
            if (!$staff) {
                return ['success' => false, 'message' => 'Staff member not found'];
            }

            return ['success' => true, 'staff' => $staff];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch staff member', 'error' => $e->getMessage()];
        }
    }

    public static function create(): array {
        try {
            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            if (empty($body)) {
                $body = $_POST ?? [];
            }

            $model = new Staff();
            return $model->create($body);
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to create staff member', 'error' => $e->getMessage()];
        }
    }

    public static function update(): array {
        try {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Staff ID is required'];
            }

            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            if (empty($body)) {
                $body = $_POST ?? [];
            }

            $model = new Staff();
            return $model->update($id, $body);
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to update staff member', 'error' => $e->getMessage()];
        }
    }

    public static function delete(): array {
        try {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Staff ID is required'];
            }

            $model = new Staff();
            return $model->delete($id);
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to delete staff member', 'error' => $e->getMessage()];
        }
    }
}
