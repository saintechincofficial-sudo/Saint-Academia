<?php
class Auth {
    public static function user(): ?array {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!str_starts_with($authHeader, 'Bearer ')) {
            return null;
        }

        $token = trim(substr($authHeader, 7));
        if ($token === '') {
            return null;
        }

        return [
            'id' => 1,
            'name' => 'Authenticated User',
            'role' => 'super_admin',
            'token' => $token,
        ];
    }
}
