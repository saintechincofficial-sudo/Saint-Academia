<?php

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JWTHandler {
    private static $secret = '';
    private static $algorithm = 'HS256';
    
    public static function init() {
        if (empty(self::$secret)) {
            $env = self::loadEnv();
            self::$secret = $env['JWT_SECRET'] ?? 'dev-secret-key-change-in-production';
        }
    }
    
    public static function loadEnv() {
        $envFile = __DIR__ . '/../../.env';
        if (!file_exists($envFile)) {
            return [];
        }
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $env = [];
        foreach ($lines as $line) {
            if (str_starts_with(trim($line), '#')) continue;
            [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
            $env[trim($key)] = trim($value, " \t\n\r\0\x0B\"");
        }
        return $env;
    }
    
    public static function generate($user_id, $email, $roles, $school_id = 1, $staff_id = null) {
        self::init();
        // Normalize roles to array
        if (is_string($roles)) {
            $decoded = json_decode($roles, true);
            $roles = is_array($decoded) ? $decoded : [$roles];
        }
        $issuedAt = time();
        $expire = $issuedAt + (24 * 60 * 60);
        $payload = [
            'iat'      => $issuedAt,
            'exp'      => $expire,
            'user_id'  => $user_id,
            'email'    => $email,
            'role'     => $roles[0],   // primary role (backward compat)
            'roles'    => $roles,       // full array
            'school_id'=> $school_id,
            'staff_id' => $staff_id,
        ];
        return JWT::encode($payload, self::$secret, self::$algorithm);
    }
    
    public static function verify($token) {
        try {
            self::init();
            return JWT::decode($token, new Key(self::$secret, self::$algorithm));
        } catch (\Exception $e) {
            return null;
        }
    }
    
    public static function getAuthorizationHeader() {
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            return trim($_SERVER['HTTP_AUTHORIZATION']);
        }

        if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
        }

        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            if (!empty($headers['Authorization'])) {
                return trim($headers['Authorization']);
            }
            if (!empty($headers['authorization'])) {
                return trim($headers['authorization']);
            }
        }

        return null;
    }

    public static function fromHeader() {
        $header = self::getAuthorizationHeader() ?? '';
        if (preg_match('/Bearer\s+(.+)/', $header, $matches)) {
            return $matches[1];
        }
        return null;
    }

    public static function getCurrentUser() {
        $token = self::fromHeader();
        if (!$token) return null;
        return self::verify($token);
    }
}
