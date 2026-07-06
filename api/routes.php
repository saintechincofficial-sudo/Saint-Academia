<?php
require_once __DIR__ . '/config/constants.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/Response.php';
require_once __DIR__ . '/utils/JWTHandler.php';
require_once __DIR__ . '/middleware/Auth.php';
require_once __DIR__ . '/middleware/CORSMiddleware.php';
require_once __DIR__ . '/models/Student.php';
require_once __DIR__ . '/controllers/HealthController.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/models/Staff.php';
require_once __DIR__ . '/models/ClassModel.php';
require_once __DIR__ . '/controllers/StudentController.php';
require_once __DIR__ . '/controllers/StaffController.php';
require_once __DIR__ . '/controllers/ClassController.php';
require_once __DIR__ . '/controllers/AttendanceController.php';
require_once __DIR__ . '/controllers/FeeController.php';
require_once __DIR__ . '/controllers/ReportController.php';
require_once __DIR__ . '/controllers/SubjectController.php';
require_once __DIR__ . '/controllers/ResultController.php';
require_once __DIR__ . '/controllers/SchoolController.php';

CORSMiddleware::handle();

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = trim($uri, '/');
$segments = $path === '' ? [] : explode('/', $path);

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

if ($resource === 'schools' && isset($segments[1]) && $segments[1] === 'me') {
    if ($method === 'GET') {
        Response::json(SchoolController::current());
        return;
    }
    if ($method === 'PUT') {
        Response::json(SchoolController::update());
        return;
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

if ($resource === 'schools' && isset($segments[1]) && is_numeric($segments[1])) {
    $_GET['id'] = $segments[1];
    if ($method === 'GET') {
        Response::json(SchoolController::show());
        return;
    }
    if ($method === 'PUT') {
        Response::json(SchoolController::update());
        return;
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

if ($resource === 'schools') {
    if ($method === 'GET') {
        Response::json(SchoolController::index());
        return;
    }
    if ($method === 'POST') {
        Response::json(SchoolController::create());
        return;
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
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
    if (isset($segments[1]) && is_numeric($segments[1])) {
        $_GET['id'] = $segments[1];
        if ($method === 'GET') {
            Response::json(StudentController::show());
            return;
        }
        if ($method === 'PUT') {
            Response::json(StudentController::update());
            return;
        }
        if ($method === 'DELETE') {
            Response::json(StudentController::delete());
            return;
        }
        Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
        return;
    }
    
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
    if (isset($segments[1]) && is_numeric($segments[1])) {
        $_GET['id'] = $segments[1];
        if ($method === 'GET') {
            Response::json(StaffController::show());
            return;
        }
        if ($method === 'PUT') {
            Response::json(StaffController::update());
            return;
        }
        if ($method === 'DELETE') {
            Response::json(StaffController::delete());
            return;
        }
        Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
        return;
    }

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
    if (isset($segments[1]) && is_numeric($segments[1])) {
        $_GET['id'] = $segments[1];
        if ($method === 'GET') {
            Response::json(ClassController::show());
            return;
        }
        if ($method === 'PUT') {
            Response::json(ClassController::update());
            return;
        }
        if ($method === 'DELETE') {
            Response::json(ClassController::delete());
            return;
        }
        Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
        return;
    }

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
    if (isset($segments[1]) && is_numeric($segments[1])) {
        $_GET['id'] = $segments[1];
        if ($method === 'PUT') {
            Response::json(SubjectController::update());
            return;
        }
        if ($method === 'DELETE') {
            Response::json(SubjectController::delete());
            return;
        }
        Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
        return;
    }
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



require_once __DIR__ . '/controllers/EnrollmentController.php';
require_once __DIR__ . '/controllers/MastersheetController.php';

if ($resource === 'enrollments') {
    if (isset($segments[1]) && $segments[1] === 'unenrolled') {
        Response::json(EnrollmentController::unenrolledStudents());
        return;
    }
    if (isset($segments[1]) && is_numeric($segments[1]) && $method === 'DELETE') {
        $_GET['id'] = $segments[1];
        Response::json(EnrollmentController::unenroll());
        return;
    }
    if ($method === 'GET')  { Response::json(EnrollmentController::index());  return; }
    if ($method === 'POST') { Response::json(EnrollmentController::enroll()); return; }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

if ($resource === 'mastersheet') {
    if ($method === 'GET') { Response::json(MastersheetController::generate()); return; }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

if ($resource === 'bulk-results') {
    if ($method === 'POST') { Response::json(MastersheetController::bulkResults()); return; }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

if ($resource === 'terms') {
    if ($method === 'GET') {
        Auth::check();
        $pdo      = getDatabaseConnection();
        $schoolId = SchoolHelper::resolveSchoolId($pdo);
        $yearId   = SchoolHelper::resolveAcademicYearId($pdo, $schoolId);
        $stmt = $pdo->prepare(
            'SELECT id, term_number, label, is_current
             FROM terms WHERE academic_year_id = ? ORDER BY term_number'
        );
        $stmt->execute([$yearId]);
        Response::json(['success' => true, 'terms' => $stmt->fetchAll()]);
        return;
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

// ── Promotion routes ───────────────────────────────────────
require_once __DIR__ . '/controllers/PromotionController.php';

if ($resource === 'promotions') {
    if (isset($segments[1]) && $segments[1] === 'preview') {
        if ($method === 'GET') { Response::json(PromotionController::preview()); return; }
    }
    if (isset($segments[1]) && $segments[1] === 'apply') {
        if ($method === 'POST') { Response::json(PromotionController::apply()); return; }
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405);
    return;
}

// ── Report Card routes ─────────────────────────────────────
require_once __DIR__ . '/controllers/ReportCardController.php';

if ($resource === 'report-card') {
    if ($method === 'GET' && isset($segments[1]) && $segments[1] === 'overview') {
        Response::json(ReportCardController::classOverview()); return;
    }
    if ($method === 'GET' && isset($segments[1]) && $segments[1] === 'all') {
        Response::json(ReportCardController::generateAll()); return;
    }
    if ($method === 'GET') {
        Response::json(ReportCardController::generate()); return;
    }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405); return;
}

// ── Workload routes ────────────────────────────────────────
require_once __DIR__ . '/controllers/WorkloadController.php';

if ($resource === 'workload') {
    if ($method === 'GET' && isset($segments[1]) && $segments[1] === 'summary') {
        Response::json(WorkloadController::summary()); return;
    }
    if ($method === 'GET')    { Response::json(WorkloadController::index());  return; }
    if ($method === 'POST')   { Response::json(WorkloadController::assign()); return; }
    if ($method === 'DELETE') { Response::json(WorkloadController::remove()); return; }
    Response::json(['success' => false, 'message' => 'Method not allowed'], 405); return;

// Catch-all - must be last
Response::json(["success" => false, "message" => "Route not found"], 404);
