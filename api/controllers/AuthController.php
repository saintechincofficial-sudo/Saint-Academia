<?php

class AuthController {
    
    public static function login(): array {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $identifier = trim($body['identifier'] ?? $body['email'] ?? '');
        $password = trim($body['password'] ?? '');
        
        if (empty($identifier) || empty($password)) {
            return [
                'success' => false,
                'message' => 'Username/User ID and password are required'
            ];
        }
        
        try {
            $pdo = getDatabaseConnection();
            
            if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
                $stmt = $pdo->prepare('
                    SELECT id, school_id, email, password_hash, role, is_active 
                    FROM users 
                    WHERE email = ? AND is_active = TRUE
                ');
                $stmt->execute([$identifier]);
            } elseif (ctype_digit($identifier)) {
                $stmt = $pdo->prepare('
                    SELECT id, school_id, email, password_hash, role, is_active 
                    FROM users 
                    WHERE (id = ? OR reference_id = ?) AND is_active = TRUE
                ');
                $stmt->execute([$identifier, $identifier]);
            } else {
                return [
                    'success' => false,
                    'message' => 'Invalid login identifier'
                ];
            }
            
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
