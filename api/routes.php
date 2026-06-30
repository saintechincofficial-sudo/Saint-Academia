<?php
require_once __DIR__ . '/config/constants.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/Response.php';
require_once __DIR__ . '/controllers/HealthController.php';
require_once __DIR__ . '/controllers/AuthController.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = trim($uri, '/');
$segments = $path === '' ? [] : explode('/', $path);

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

Response::json(['success' => false, 'message' => 'Route not found'], 404);
