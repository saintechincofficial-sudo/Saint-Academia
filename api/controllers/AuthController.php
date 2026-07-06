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
                    SELECT id, school_id, staff_id, email, password_hash, role, is_active 
                    FROM users 
                    WHERE email = ? AND is_active = TRUE
                ');
                $stmt->execute([$identifier]);
            } elseif (ctype_digit($identifier)) {
                $stmt = $pdo->prepare('
                    SELECT id, school_id, staff_id, email, password_hash, role, is_active 
                    FROM users 
                    WHERE (id = ? OR reference_id = ?) AND is_active = TRUE
                ');
                $stmt->execute([$identifier, $identifier]);
            } else {
                // Try staff_number login
                $stmt = $pdo->prepare('
                    SELECT u.id, u.school_id, u.staff_id, u.email, u.password_hash, u.role, u.is_active
                    FROM users u
                    JOIN staff s ON s.id = u.staff_id
                    WHERE s.staff_number = ? AND u.is_active = TRUE
                ');
                $stmt->execute([$identifier]);
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
                $user['school_id'],
                $user['staff_id'] ?? null
            );
            
            return [
                'success' => true,
                'message' => 'Login successful',
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'role'      => $user['role'],
                    'roles'     => is_string($user['role']) ? (json_decode($user['role'], true) ?? [$user['role']]) : (array)$user['role'],
                    'school_id' => $user['school_id'],
                    'staff_id'  => $user['staff_id'] ?? null
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
