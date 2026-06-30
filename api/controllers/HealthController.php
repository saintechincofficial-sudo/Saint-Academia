<?php
class HealthController {
    public static function index(): array {
        return [
            'app' => APP_NAME,
            'version' => APP_VERSION,
            'status' => 'ok',
            'timestamp' => date(DATE_ATOM),
        ];
    }
}
