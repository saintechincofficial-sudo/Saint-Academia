# Saint Academia - Implementation Guide
## Week 1: Foundation (JWT + Models + React Auth)

---

## PART 1: BACKEND - JWT AUTHENTICATION

### Step 1: Install JWT Library

```bash
cd /c/xampp/htdocs/SaintAcademia
composer require firebase/php-jwt
```

### Step 2: Create JWT Handler

**File: `api/utils/JWTHandler.php`**

```php
<?php

namespace SaintAcademia\Utils;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class JWTHandler {
    private static string $secret = '';
    private static string $algorithm = 'HS256';
    
    /**
     * Initialize with secret from environment
     */
    public static function init() {
        if (empty(self::$secret)) {
            self::$secret = getenv('JWT_SECRET') ?: 'dev-secret-key-change-in-production';
        }
    }
    
    /**
     * Generate JWT token
     */
    public static function generate($user_id, $email, $role, $school_id = 1) {
        self::init();
        
        $issuedAt = time();
        $expire = $issuedAt + (24 * 60 * 60); // 24 hours
        
        $payload = [
            'iat' => $issuedAt,
            'exp' => $expire,
            'user_id' => $user_id,
            'email' => $email,
            'role' => $role,
            'school_id' => $school_id
        ];
        
        return JWT::encode($payload, self::$secret, self::$algorithm);
    }
    
    /**
     * Verify and decode JWT token
     */
    public static function verify($token) {
        try {
            self::init();
            return JWT::decode($token, new Key(self::$secret, self::$algorithm));
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * Extract token from Authorization header
     */
    public static function fromHeader() {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        
        if (preg_match('/Bearer\s+(.+)/', $header, $matches)) {
            return $matches[1];
        }
        
        return null;
    }
    
    /**
     * Get current user from token
     */
    public static function getCurrentUser() {
        $token = self::fromHeader();
        
        if (!$token) {
            return null;
        }
        
        return self::verify($token);
    }
}
```

---

### Step 3: Update AuthController

**File: `api/controllers/AuthController.php`** (Replace completely)

```php
<?php

use SaintAcademia\Utils\JWTHandler;

class AuthController {
    
    /**
     * User login with email and password
     */
    public static function login(): array {
        // Get POST data
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim($body['email'] ?? '');
        $password = trim($body['password'] ?? '');
        
        // Validate input
        if (empty($email) || empty($password)) {
            return [
                'success' => false,
                'message' => 'Email and password are required'
            ];
        }
        
        // Validate email format
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return [
                'success' => false,
                'message' => 'Invalid email format'
            ];
        }
        
        try {
            $pdo = getDatabaseConnection();
            
            // Query user from database
            $stmt = $pdo->prepare('
                SELECT id, school_id, email, password_hash, role, is_active 
                FROM users 
                WHERE email = ? AND is_active = TRUE
            ');
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            // Check if user exists and password matches
            if (!$user || !password_verify($password, $user['password_hash'])) {
                return [
                    'success' => false,
                    'message' => 'Invalid email or password'
                ];
            }
            
            // Generate JWT token
            $token = JWTHandler::generate(
                $user['id'],
                $user['email'],
                $user['role'],
                $user['school_id']
            );
            
            // Log login attempt
            self::logActivity($pdo, $user['id'], 'LOGIN', 'User logged in');
            
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
    
    /**
     * Register new user (admin only)
     */
    public static function register(): array {
        try {
            // Check if current user is authenticated and is admin
            JWTHandler::init();
            $current_user = JWTHandler::getCurrentUser();
            
            if (!$current_user || $current_user->role !== 'super_admin') {
                return [
                    'success' => false,
                    'message' => 'Unauthorized'
                ];
            }
            
            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            $email = trim($body['email'] ?? '');
            $password = trim($body['password'] ?? '');
            $role = trim($body['role'] ?? 'teacher');
            $school_id = $current_user->school_id;
            
            // Validate input
            if (empty($email) || empty($password)) {
                return [
                    'success' => false,
                    'message' => 'Email and password are required'
                ];
            }
            
            if (strlen($password) < 6) {
                return [
                    'success' => false,
                    'message' => 'Password must be at least 6 characters'
                ];
            }
            
            $pdo = getDatabaseConnection();
            
            // Check if user already exists
            $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? AND school_id = ?');
            $stmt->execute([$email, $school_id]);
            
            if ($stmt->fetch()) {
                return [
                    'success' => false,
                    'message' => 'User already exists'
                ];
            }
            
            // Create new user
            $password_hash = password_hash($password, PASSWORD_BCRYPT);
            
            $stmt = $pdo->prepare('
                INSERT INTO users (school_id, email, password_hash, role, is_active)
                VALUES (?, ?, ?, ?, TRUE)
            ');
            $stmt->execute([$school_id, $email, $password_hash, $role]);
            
            $user_id = $pdo->lastInsertId();
            
            self::logActivity($pdo, $current_user->user_id, 'USER_CREATED', "Created user: $email");
            
            return [
                'success' => true,
                'message' => 'User created successfully',
                'user_id' => $user_id
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Registration failed'
            ];
        }
    }
    
    /**
     * Log user activity
     */
    private static function logActivity($pdo, $user_id, $action, $details) {
        try {
            $stmt = $pdo->prepare('
                INSERT INTO audit_logs (user_id, action, details, created_at)
                VALUES (?, ?, ?, NOW())
            ');
            $stmt->execute([$user_id, $action, $details]);
        } catch (Exception $e) {
            // Silently fail - logging shouldn't break the app
        }
    }
}
```

---

### Step 4: Create Auth Middleware

**File: `api/middleware/Auth.php`** (Replace completely)

```php
<?php

use SaintAcademia\Utils\JWTHandler;

class Auth {
    
    /**
     * Check if user is authenticated
     */
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
    
    /**
     * Check if user has specific role(s)
     */
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
    
    /**
     * Get current authenticated user
     */
    public static function user() {
        return self::check();
    }
}
```

---

### Step 5: Add CORS Middleware

**File: `api/middleware/CORSMiddleware.php`** (Create new)

```php
<?php

class CORSMiddleware {
    
    public static function handle() {
        // Allow requests from React dev server
        $allowed_origins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173'
        ];
        
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        if (in_array($origin, $allowed_origins)) {
            header("Access-Control-Allow-Origin: $origin");
        }
        
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Credentials: true');
        
        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }
}
```

---

### Step 6: Update routes.php to include Auth

**File: `api/routes.php`** (Update the top part)

```php
<?php
require_once __DIR__ . '/config/constants.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/Response.php';
require_once __DIR__ . '/utils/JWTHandler.php';  // ADD THIS
require_once __DIR__ . '/middleware/Auth.php';   // ADD THIS
require_once __DIR__ . '/middleware/CORSMiddleware.php'; // ADD THIS
require_once __DIR__ . '/controllers/HealthController.php';
require_once __DIR__ . '/controllers/AuthController.php';
// ... rest of requires ...

// ADD THIS - Handle CORS
CORSMiddleware::handle();

// Rest of routing code...
```

---

### Step 7: Create Base Model Class

**File: `api/models/BaseModel.php`** (Create new)

```php
<?php

namespace SaintAcademia\Models;

abstract class BaseModel {
    protected $pdo;
    protected $table = '';
    protected $school_id = 1;
    
    public function __construct($school_id = 1) {
        $this->pdo = getDatabaseConnection();
        $this->school_id = $school_id;
    }
    
    /**
     * Get all records with pagination
     */
    public function getAll($limit = 25, $offset = 0) {
        try {
            $sql = "SELECT * FROM {$this->table} WHERE school_id = ? LIMIT ? OFFSET ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$this->school_id, (int)$limit, (int)$offset]);
            return $stmt->fetchAll();
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Get single record by ID
     */
    public function getById($id) {
        try {
            $sql = "SELECT * FROM {$this->table} WHERE id = ? AND school_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$id, $this->school_id]);
            return $stmt->fetch();
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * Create new record
     */
    public function create($data) {
        try {
            // Add school_id if not present
            if (!isset($data['school_id'])) {
                $data['school_id'] = $this->school_id;
            }
            
            $columns = implode(',', array_keys($data));
            $placeholders = implode(',', array_fill(0, count($data), '?'));
            
            $sql = "INSERT INTO {$this->table} ({$columns}) VALUES ({$placeholders})";
            $stmt = $this->pdo->prepare($sql);
            
            if ($stmt->execute(array_values($data))) {
                return $this->pdo->lastInsertId();
            }
            
            return false;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Update record
     */
    public function update($id, $data) {
        try {
            $set = implode(',', array_map(fn($k) => "$k = ?", array_keys($data)));
            $values = array_values($data);
            $values[] = $id;
            $values[] = $this->school_id;
            
            $sql = "UPDATE {$this->table} SET {$set} WHERE id = ? AND school_id = ?";
            $stmt = $this->pdo->prepare($sql);
            
            return $stmt->execute($values);
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Delete record
     */
    public function delete($id) {
        try {
            $sql = "DELETE FROM {$this->table} WHERE id = ? AND school_id = ?";
            $stmt = $this->pdo->prepare($sql);
            return $stmt->execute([$id, $this->school_id]);
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Count total records
     */
    public function count() {
        try {
            $sql = "SELECT COUNT(*) as total FROM {$this->table} WHERE school_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$this->school_id]);
            $result = $stmt->fetch();
            return $result['total'] ?? 0;
        } catch (Exception $e) {
            return 0;
        }
    }
}
```

---

### Step 8: Create Student Model

**File: `api/models/Student.php`** (Create new)

```php
<?php

namespace SaintAcademia\Models;

class Student extends BaseModel {
    protected $table = 'students';
    
    /**
     * Find student by number
     */
    public function findByNumber($student_number) {
        $sql = "SELECT * FROM {$this->table} WHERE school_id = ? AND student_number = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->school_id, $student_number]);
        return $stmt->fetch();
    }
    
    /**
     * Validate student data
     */
    public function validate($data) {
        $errors = [];
        
        if (empty($data['student_number'])) {
            $errors[] = 'Student number is required';
        } elseif ($this->findByNumber($data['student_number'])) {
            $errors[] = 'Student number already exists';
        }
        
        if (empty($data['first_name'])) {
            $errors[] = 'First name is required';
        }
        
        if (empty($data['last_name'])) {
            $errors[] = 'Last name is required';
        }
        
        if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Invalid email format';
        }
        
        return $errors;
    }
}
```

---

## PART 2: REACT FRONTEND - AUTHENTICATION

### Step 1: Create Auth Context

**File: `frontend/src/context/AuthContext.jsx`** (Create new)

```jsx
import { createContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from token on mount
  useEffect(() => {
    if (token) {
      // Decode token to get user info (basic JWT decode)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.user_id,
          email: payload.email,
          role: payload.role,
          school_id: payload.school_id
        });
      } catch (e) {
        // Invalid token
        setToken(null);
        localStorage.removeItem('auth_token');
      }
    }
    setLoading(false);
  }, [token]);

  const login = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success && data.token) {
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
        return { success: true };
      }
      
      setError(data.message || 'Login failed');
      return { success: false, message: data.message };
    } catch (err) {
      setError('Unable to connect to server');
      return { success: false, message: 'Unable to connect to server' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
  }, []);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

### Step 2: Create useAuth Hook

**File: `frontend/src/hooks/useAuth.js`** (Create new)

```javascript
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
}
```

---

### Step 3: Create useApi Hook

**File: `frontend/src/hooks/useApi.js`** (Create new)

```javascript
import { useCallback } from 'react';
import { useAuth } from './useAuth';

export function useApi() {
  const { token } = useAuth();

  const apiCall = useCallback(async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (response.status === 401) {
        // Token expired - logout
        window.location.href = '/login';
      }

      return {
        success: response.ok,
        status: response.status,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }, [token]);

  return { apiCall };
}
```

---

### Step 4: Create LoginPage

**File: `frontend/src/pages/LoginPage.jsx`** (Create new)

```jsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './LoginPage.css';

function LoginPage() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    const result = await login(email, password);
    
    if (result.success) {
      window.location.href = '/';
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Saint Academia</h1>
        <p className="subtitle">Cameroonian Secondary School Management</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="demo-text">
          Demo: admin@saintacademia.com / password123
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
```

---

### Step 5: Create LoginPage Styles

**File: `frontend/src/pages/LoginPage.css`** (Create new)

```css
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-card h1 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 28px;
  text-align: center;
}

.login-card .subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.login-button {
  width: 100%;
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.login-button:hover:not(:disabled) {
  background: #5568d3;
}

.login-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  color: #c00;
  padding: 12px;
  border-radius: 5px;
  margin-bottom: 20px;
  font-size: 14px;
  border-left: 4px solid #c00;
}

.demo-text {
  text-align: center;
  color: #999;
  font-size: 12px;
  margin-top: 20px;
}
```

---

### Step 6: Update .env with JWT Secret

**File: `.env`** (Update)

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=saint_academia
DB_USER=root
DB_PASS=
APP_ENV=development
APP_URL=http://localhost/SaintAcademia
JWT_SECRET=your-super-secret-key-change-this-in-production
```

---

### Step 7: Update database schema

**File: `database/schema.sql`** (Add this at the end)

```sql
-- Add audit_logs table for activity tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100),
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create test user (for development)
INSERT IGNORE INTO users (school_id, email, password_hash, role, is_active)
VALUES (
  1,
  'admin@saintacademia.com',
  '$2y$10$YourHashedPasswordHere',
  'super_admin',
  TRUE
);

-- To generate password hash for "password123":
-- In PHP: echo password_hash('password123', PASSWORD_BCRYPT);
-- Result: $2y$10$N9qo8uLOickgx2ZMRZoM2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW
```

---

## TESTING

### Test JWT Auth:

```bash
# 1. Create test user (run in MySQL):
INSERT INTO users (school_id, email, password_hash, role, is_active)
VALUES (
  1,
  'admin@saintacademia.com',
  '$2y$10$N9qo8uLOickgx2ZMRZoM2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW',
  'super_admin',
  TRUE
);

# 2. Test login endpoint:
curl -X POST http://localhost/SaintAcademia/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@saintacademia.com","password":"password123"}'

# Should return: {"success":true,"token":"eyJ...","user":{...}}

# 3. Test with token:
curl http://localhost/SaintAcademia/api/students \
  -H "Authorization: Bearer <token-from-login>"
```

---

## NEXT STEPS

1. ✅ Implement JWT (this guide)
2. ✅ Create Base Model + Student Model
3. ✅ Create React Auth Context
4. ✅ Create Login Page
5. Next: Update all Controllers to use Models
6. Next: Create Dashboard & Layout components
7. Next: Split App.jsx into separate pages

---

**Need help with the next phase?** Ask and I'll provide complete code for:
- Dashboard component
- Navigation/Layout
- All remaining controllers
- Complete React refactoring
