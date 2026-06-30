<?php
class AuthController {
    public static function login(): array {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim($body['email'] ?? '');
        $password = trim($body['password'] ?? '');

        if ($email === '' || $password === '') {
            return ['success' => false, 'message' => 'Email and password are required'];
        }

        if ($email === 'admin@saintacademia.com' && $password === 'password123') {
            return [
                'success' => true,
                'token' => 'demo-jwt-token-' . bin2hex(random_bytes(8)),
                'user' => [
                    'id' => 1,
                    'name' => 'Admin User',
                    'role' => 'super_admin',
                    'email' => $email,
                ],
            ];
        }

        return ['success' => false, 'message' => 'Invalid credentials'];
    }
}
