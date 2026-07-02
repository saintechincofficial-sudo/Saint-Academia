<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../utils/TenantContext.php';
require_once __DIR__ . '/../models/Student.php';

class StudentController {
    public static function index(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $model = new Student();
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 25;
            $search = isset($_GET['search']) ? trim($_GET['search']) : '';

            if (!empty($search)) {
                $students = $model->search($search, $page, $limit);
                $total = $model->searchCount($search);
            } else {
                $students = $model->getAll($page, $limit);
                $total = $model->getCount();
            }

            $pages = $limit > 0 ? (int) ceil($total / $limit) : 1;

            return [
                'success' => true,
                'students' => $students,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $pages,
                    'total_items' => $total,
                    'per_page' => $limit
                ]
            ];
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch students', 'error' => $e->getMessage()];
        }
    }

    public static function show(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Student ID is required'];
            }

            $model = new Student();
            $student = $model->getById($id);

            if (!$student) {
                return ['success' => false, 'message' => 'Student not found'];
            }

            return ['success' => true, 'student' => $student];
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch student', 'error' => $e->getMessage()];
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

            $model = new Student();
            $result = $model->create($body);
            return $result;
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to create student', 'error' => $e->getMessage()];
        }
    }

    public static function update(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Student ID is required'];
            }

            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            if (empty($body)) {
                $body = $_POST ?? [];
            }

            $model = new Student();
            $result = $model->update($id, $body);
            return $result;
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to update student', 'error' => $e->getMessage()];
        }
    }

    public static function delete(): array {
        try {
            Auth::check();
            TenantContext::requireSchoolId();

            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                return ['success' => false, 'message' => 'Student ID is required'];
            }

            $model = new Student();
            $result = $model->delete($id);
            return $result;
        } catch (RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to delete student', 'error' => $e->getMessage()];
        }
    }
}
