# Saint Academia - Quick Reference & Today's Summary

---

## 📌 TODAY'S ACCOMPLISHMENTS

### What We Built (4-5 Hours of Work)

#### Backend (PHP)
- ✅ JWT Authentication with firebase/php-jwt
- ✅ CORS Middleware for React communication
- ✅ Auth Middleware for protected routes
- ✅ Real login with bcrypt password verification
- ✅ Database connection via PDO
- ✅ Fixed URL routing with .htaccess

#### Frontend (React)
- ✅ AuthContext for global authentication state
- ✅ useAuth & useApi custom hooks
- ✅ Professional login page UI
- ✅ Dashboard page (basic welcome screen)
- ✅ Automatic token management (localStorage)
- ✅ CORS configuration for local dev

#### Infrastructure
- ✅ Environment variables setup (.env)
- ✅ Database schema created
- ✅ Test admin user created
- ✅ Composer dependencies installed
- ✅ Code committed to Git

---

## ⚡ Quick Start (30 seconds)

**For partners just cloning the repo:**

```bash
# 1. Clone repo
git clone https://github.com/saintechincofficial-sudo/Saint-Academia.git
cd Saint-Academia

# 2. Setup backend (one-time)
composer install

# 3. Setup database (one-time)
# Go to http://localhost/phpmyadmin
# Create database: saint_academia
# Import: database/schema.sql

# 4. Create test user (one-time, via PhpMyAdmin SQL tab)
INSERT INTO users (school_id, email, password_hash, role, is_active) VALUES (
  1, 'admin@saintacademia.com', 
  '$2y$10$EEtdL80.PlXp4gN/r6sKgeQdUrj5hpGHrO1BGYRwwJeY6A/7OfoKS',
  'super_admin', TRUE
);

# 5. Start React (one-time per session)
cd frontend && npm install && npm run dev

# 6. Start Apache in XAMPP Control Panel

# 7. Open http://localhost:3000 and login!
```

---

## 🎯 Key Endpoints

### Authentication
```
POST /api/auth/login
Content-Type: application/json

Request:
{
  "email": "admin@saintacademia.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "eyJ0eXAi...",
  "user": {
    "id": 1,
    "email": "admin@saintacademia.com",
    "role": "super_admin"
  }
}
```

### Protected Endpoints (Requires JWT Token)
```
GET /api/students
Authorization: Bearer <token>

GET /api/staff
Authorization: Bearer <token>

GET /api/classes
Authorization: Bearer <token>

... more coming soon
```

---

## 🔧 Common Tasks

### Add a New Admin User
```bash
# Via PhpMyAdmin SQL tab or MySQL CLI
"C:\xampp\mysql\bin\mysql.exe" -u root saint_academia << 'EOF'
INSERT INTO users (school_id, email, password_hash, role, is_active) VALUES (
  1,
  'newadmin@example.com',
  '$2y$10$EEtdL80.PlXp4gN/r6sKgeQdUrj5hpGHrO1BGYRwwJeY6A/7OfoKS',
  'admin',
  TRUE
);
EOF

# Password is "password123"
```

### Update Frontend Code
```bash
cd frontend
# Changes auto-reload on save (Vite hot reload)
# If not, press r + enter in dev server terminal
```

### Update Backend Code
```bash
# PHP changes take effect immediately
# No need to restart server
# Check browser console for errors (F12)
```

### Test API with curl
```bash
# Login first
curl -X POST http://localhost/Saint-Academia/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@saintacademia.com\",\"password\":\"password123\"}"

# Copy token, then use it
curl http://localhost/Saint-Academia/api/students \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Check Database
```bash
# Option 1: PhpMyAdmin
http://localhost/phpmyadmin

# Option 2: MySQL CLI
"C:\xampp\mysql\bin\mysql.exe" -u root saint_academia
SELECT * FROM users;
SELECT * FROM students;
```

---

## 📁 Important Files

### Backend
| File | Purpose |
|------|---------|
| `api/utils/JWTHandler.php` | Generate & verify JWT tokens |
| `api/middleware/Auth.php` | Validate JWT on protected routes |
| `api/middleware/CORSMiddleware.php` | Allow cross-origin requests |
| `api/controllers/AuthController.php` | Login logic |
| `api/routes.php` | API endpoint definitions |
| `public/index.php` | PHP entry point (includes autoloader) |
| `.htaccess` | URL rewriting rules |
| `.env` | Database & JWT config |

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/context/AuthContext.jsx` | Global auth state |
| `frontend/src/hooks/useAuth.js` | Hook to access auth |
| `frontend/src/hooks/useApi.js` | HTTP wrapper with JWT |
| `frontend/src/pages/LoginPage.jsx` | Login form |
| `frontend/src/pages/DashboardPage.jsx` | Main page |
| `frontend/src/App.jsx` | App routing logic |
| `frontend/src/main.jsx` | React entry point |

---

## 🔑 Test Credentials

```
Email: admin@saintacademia.com
Password: password123
Role: super_admin
```

---

## 🚨 DO NOT DO THIS

❌ **Don't commit .env** - Contains sensitive data  
❌ **Don't modify JWT_SECRET in code** - Use .env file  
❌ **Don't hardcode API URLs** - They're in hooks already  
❌ **Don't test on production** - Always use localhost first  
❌ **Don't delete database before backup** - Make a backup first  

---

## 🆘 Quick Troubleshooting

| Issue | Fix |
|-------|-----|
| "Route not found" | Check .htaccess in project root, enable mod_rewrite |
| CORS error | Add your port to CORSMiddleware.php allowed_origins |
| Database error | Verify MySQL running, check DB_HOST/DB_USER/DB_PASS in .env |
| "Class not found" | Run `composer install` |
| React won't start | Run `npm install` in frontend folder |
| Login fails | Verify admin user exists in database |
| Token invalid | Clear localStorage, login again |

---

## 📞 Getting Help

1. **Read DEVELOPER_SETUP_GUIDE.md** - Full setup instructions
2. **Read IMPLEMENTATION_GUIDE.md** - How JWT was built
3. **Read CODE_REVIEW.md** - What needs to be built next
4. **Check browser console** - F12 for JavaScript errors
5. **Check terminal** - Look for PHP/Node errors
6. **Test API directly** - Use curl to isolate issues

---

## 🎓 Architecture at a Glance

```
User Browser
    ↓
    └──→ React App (localhost:3000)
         ├─ Login Page
         ├─ Dashboard Page
         └─ AuthContext (manages JWT token)
              ↓
              └──→ PHP API (localhost/Saint-Academia/api)
                   ├─ CORSMiddleware (allows requests)
                   ├─ Auth.php (validates JWT)
                   ├─ AuthController (login logic)
                   ├─ StudentController (coming soon)
                   └─ ... more controllers
                        ↓
                        └──→ MySQL Database
                             ├─ users table
                             ├─ students table
                             └─ ... more tables
```

---

## 📊 Current Status

| Component | Status | Completion |
|-----------|--------|-----------|
| Database Schema | ✅ Done | 30% (base tables only) |
| JWT Authentication | ✅ Done | 100% |
| Login UI | ✅ Done | 100% |
| Dashboard (basic) | ✅ Done | 20% (needs content) |
| Student Module | ⏳ Todo | 0% |
| Staff Module | ⏳ Todo | 0% |
| Class Module | ⏳ Todo | 0% |
| Attendance Module | ⏳ Todo | 0% |
| Grades Module | ⏳ Todo | 0% |
| Fees Module | ⏳ Todo | 0% |
| Reports (PDF) | ⏳ Todo | 0% |
| ID Cards (QR) | ⏳ Todo | 0% |

---

## 🎯 Next Steps for Phase 2

**Option A: Student Management** (Recommended first)
- Create Student model (database queries)
- Build StudentController (CRUD API)
- Build StudentList component (React)
- Build StudentForm component (React)
- Add student table & forms to Dashboard

**Option B: Staff Management**
- Similar to Student Management
- Separate permission levels (HOD, Teacher, Admin)

**Option C: Class Management**
- Create ClassLevel & Class models
- Build ClassController (CRUD)
- Link to academic years & terms

**Pick one and we'll build it completely!**

---

## 💡 Development Tips

1. **Use browser DevTools** (F12) to debug
   - Network tab: See API requests/responses
   - Console tab: See JavaScript errors
   - Application tab: Check localStorage for token

2. **Use Postman or curl** to test API without frontend
   - Test endpoints in isolation
   - Debug server-side issues

3. **Check terminal output**
   - React dev server output (npm run dev)
   - PHP errors (if any)

4. **Commit frequently**
   - After each working feature
   - Use clear commit messages
   - Example: `git commit -m "Add student list component"`

5. **Create feature branches**
   - `git checkout -b feature/student-management`
   - Work separately from main
   - Merge when tested

---

**🎉 Welcome to Saint Academia Development Team!**

You now have a production-ready authentication system and are ready to build amazing features!

Questions? Check the guides above or ask the team! 🚀
