<?php

class Auth {
    
    public static function check() {
        $user = JWTHandler::getCurrentUser();
        
        if (!$user) {
            Response::json([
                'success' => false,
                'message' => 'Unauthorized - No valid token provided'
            ], 401);
            exit;
        }
        
        return $user;
    }
    
    public static function hasRole($roles) {
        $user = self::check();
        $roles = is_array($roles) ? $roles : [$roles];
        
        if (!in_array($user->role, $roles)) {
            Response::json([
                'success' => false,
                'message' => 'Forbidden - Insufficient permissions'
            ], 403);
            exit;
        }
        
        return $user;
    }
    
    public static function user() {
        return self::check();
    }
    
    public static function optional() {
        return JWTHandler::getCurrentUser();
    }
}
