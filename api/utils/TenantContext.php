<?php
require_once __DIR__ . '/JWTHandler.php';

class TenantContext {
    public static function currentUser(): ?object {
        return JWTHandler::getCurrentUser();
    }

    public static function getSchoolId($fallback = null): ?int {
        // 1. X-School-Context header (superadmin switching into a school)
        $header = $_SERVER['HTTP_X_SCHOOL_CONTEXT']
               ?? $_SERVER['HTTP_X_SCHOOL_ID']
               ?? null;
        if ($header && (int)$header > 0) {
            return (int)$header;
        }

        // 2. JWT school_id
        $user = self::currentUser();
        if ($user && isset($user->school_id) && (int)$user->school_id > 0) {
            return (int)$user->school_id;
        }

        if ($fallback !== null) return (int)$fallback;
        return null;
    }

    public static function requireSchoolId($fallback = null): int {
        $schoolId = self::getSchoolId($fallback);
        if ($schoolId === null || $schoolId <= 0) {
            throw new RuntimeException('School context is required');
        }
        return $schoolId;
    }

    public static function isSuperAdmin($user = null): bool {
        if ($user === null) $user = self::currentUser();
        if (!$user) return false;
        $roles = isset($user->roles) ? (array)$user->roles : [$user->role ?? ''];
        return in_array('super_admin', $roles);
    }
}
