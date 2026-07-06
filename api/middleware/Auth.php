<?php
class Auth {
    public static function check() {
        $user = JWTHandler::getCurrentUser();
        if (!$user) {
            Response::json(['success'=>false,'message'=>'Unauthorized - No valid token provided'], 401);
            exit;
        }
        return $user;
    }

    // Get user roles as array (supports both old string and new array format)
    public static function getRoles($user): array {
        if (isset($user->roles)) return (array) $user->roles;
        return [$user->role];
    }

    // Block if user doesn't have ANY of the required roles
    public static function hasRole($required) {
        $user     = self::check();
        $required = is_array($required) ? $required : [$required];
        $userRoles = self::getRoles($user);
        if (empty(array_intersect($required, $userRoles))) {
            Response::json(['success'=>false,'message'=>'Forbidden - Insufficient permissions'], 403);
            exit;
        }
        return $user;
    }

    // Check without blocking
    public static function userHasRole(string $role): bool {
        $user = JWTHandler::getCurrentUser();
        if (!$user) return false;
        return in_array($role, self::getRoles($user));
    }

    public static function isTeacherOnly(): bool {
        $user = JWTHandler::getCurrentUser();
        if (!$user) return false;
        $roles = self::getRoles($user);
        // Teacher-only = has teacher but not school_admin or principal
        return in_array('teacher', $roles)
            && !in_array('school_admin', $roles)
            && !in_array('principal', $roles);
    }

    public static function user()     { return self::check(); }
    public static function optional() { return JWTHandler::getCurrentUser(); }
}
