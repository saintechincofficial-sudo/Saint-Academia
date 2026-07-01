<?php

class AuthController {
    
    public static function login(): array {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim($body['email'] ?? '');
        $password = trim($body['password'] ?? '');
        
        if (empty($email) || empty($password)) {
            return [
                'success' => false,
                'message' => 'Email and password are required'
            ];
        }
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return [
                'success' => false,
                'message' => 'Invalid email format'
            ];
        }
        
        try {
            $pdo = getDatabaseConnection();
            
            $stmt = $pdo->prepare('
                SELECT id, school_id, email, password_hash, role, is_active 
                FROM users 
                WHERE email = ? AND is_active = TRUE
            ');
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            if (!$user || !password_verify($password, $user['password_hash'])) {
                return [
                    'success' => false,
                    'message' => 'Invalid email or password'
                ];
            }
            
            $token = JWTHandler::generate(
                $user['id'],
                $user['email'],
                $user['role'],
                $user['school_id']
            );
            
            return [
                'success' => true,
                'message' => 'Login successful',
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'school_id' => $user['school_id']
                ]
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Login failed. Please try again later.'
            ];
        }
    }
}
