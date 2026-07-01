<?php
require_once __DIR__ . '/config/constants.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/Response.php';
require_once __DIR__ . '/utils/JWTHandler.php';
require_once __DIR__ . '/middleware/Auth.php';
require_once __DIR__ . '/middleware/CORSMiddleware.php';
require_once __DIR__ . '/controllers/HealthController.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/StudentController.php';
require_once __DIR__ . '/controllers/StaffController.php';
require_once __DIR__ . '/controllers/ClassController.php';
require_once __DIR__ . '/controllers/AttendanceController.php';
require_once __DIR__ . '/controllers/FeeController.php';
require_once __DIR__ . '/controllers/ReportController.php';
require_once __DIR__ . '/controllers/SubjectController.php';
require_once __DIR__ . '/controllers/ResultController.php';

// Handle CORS
CORSMiddleware::handle();

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = trim($uri, '/');
$segments = $path === '' ? [] : explode('/', $path);

// Strip project directory from path
if (($segments[0] ?? '') === 'SaintAcademia') {
    array_shift($segments);
}

if (($segments[0] ?? '') === 'api') {
    array_shift($segments);
}

$resource = $segments[0] ?? 'health';
$method = $_SERVER['REQUEST_METHOD'];

if ($resource === 'health') {
    Response::json(HealthController::index());
    return;
}

if ($resource === 'auth' && isset($segments[1]) && $segments[1] === 'login') {
    if ($method !== 'POST') {
        Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
        return;
    }
    Response::json(AuthController::login());
    return;
}

if ($resource === 'students') {
    if ($method === 'GET') {
        Response::json(StudentController::index());
        return;
    }
    if ($method === 'POST') {
        Response::json(StudentController::create());
        return;
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

if ($resource === 'staff') {
    if ($method === 'GET') {
        Response::json(StaffController::index());
        return;
    }
    if ($method === 'POST') {
        Response::json(StaffController::create());
        return;
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

if ($resource === 'classes') {
    if ($method === 'GET') {
        Response::json(ClassController::index());
        return;
    }
    if ($method === 'POST') {
        Response::json(ClassController::create());
        return;
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

if ($resource === 'subjects') {
    if ($method === 'GET') {
        Response::json(SubjectController::index());
        return;
    }
    if ($method === 'POST') {
        Response::json(SubjectController::create());
        return;
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

if ($resource === 'results') {
    if ($method === 'GET') {
        Response::json(ResultController::index());
        return;
    }
    if ($method === 'POST') {
        Response::json(ResultController::create());
        return;
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

if ($resource === 'attendance') {
    if ($method === 'GET') {
        Response::json(AttendanceController::index());
        return;
    }
    if ($method === 'POST') {
        Response::json(AttendanceController::create());
        return;
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

if ($resource === 'fees') {
    if ($method === 'GET') {
        Response::json(FeeController::index());
        return;
    }
    if ($method === 'POST') {
        if (isset($segments[1]) && $segments[1] === 'pay') {
            Response::json(FeeController::pay());
            return;
        }
        Response::json(FeeController::create());
        return;
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

if ($resource === 'reports') {
    if ($method === 'GET') {
        Response::json(ReportController::index());
        return;
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

Response::json(['success' => false, 'message' => 'Route not found'], 404);
