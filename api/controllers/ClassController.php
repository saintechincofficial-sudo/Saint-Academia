<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/TenantContext.php';
require_once __DIR__ . '/../models/ClassModel.php';

class ClassController {
    public static function index(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $model = new ClassModel();
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 25;
            $search = isset($_GET['search']) ? trim($_GET['search']) : '';

            if (!empty($search)) {
                $classes = $model->search($search, $page, $limit);
                $total = $model->searchCount($search);
            } else {
                $classes = $model->getAll($page, $limit);
                $total = $model->getCount();
            }

            $pages = $limit > 0 ? (int) ceil($total / $limit) : 1;

            return [
                'success' => true,
                'classes' => $classes,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $pages,
                    'total_items' => $total,
                    'per_page' => $limit,
                ],
            ];
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch classes', 'error' => $e->getMessage()];
        }
    }

    public static function show(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Class ID is required'];
            }

            $model = new ClassModel();
            $class = $model->getById($id);
            if (!$class) {
                return ['success' => false, 'message' => 'Class not found'];
            }

            return ['success' => true, 'class' => $class];
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch class', 'error' => $e->getMessage()];
        }
    }

    public static function create(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            if (empty($body)) {
                $body = $_POST ?? [];
            }

            $model = new ClassModel();
            return $model->create($body);
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to create class', 'error' => $e->getMessage()];
        }
    }

    public static function update(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Class ID is required'];
            }

            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            if (empty($body)) {
                $body = $_POST ?? [];
            }

            $model = new ClassModel();
            return $model->update($id, $body);
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to update class', 'error' => $e->getMessage()];
        }
    }

    public static function delete(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Class ID is required'];
            }

            $model = new ClassModel();
            return $model->delete($id);
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to delete class', 'error' => $e->getMessage()];
        }
    }
}
