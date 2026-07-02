# Saint Academia - Developer Setup Guide
**Version 2.0** | JWT Authentication + React Login | Ready for Phase 2

---

## 📋 What Was Built Today

✅ **Backend (PHP)**
- JWT Authentication system (firebase/php-jwt)
- CORS middleware for cross-origin requests
- Auth middleware for protected routes
- Real login with database password verification
- Database connection via PDO

✅ **Frontend (React)**
- AuthContext for global auth state management
- useAuth and useApi custom hooks
- Professional login page with validation
- Dashboard page (basic)
- Automatic token management (localStorage)

✅ **Database**
- User table with password hashing
- Test admin user created
- Schema ready for more tables

✅ **Deployment Ready**
- .htaccess routing configured
- Environment variables setup (.env)
- Composer autoloading working

---

## 🔧 Prerequisites

Before starting, make sure you have:

1. **XAMPP** (with Apache + MySQL + PHP 8.1+)
   - Download: https://www.apachefriends.org/
   - Start Apache and MySQL services

2. **Git** (for cloning the repo)
   - Download: https://git-scm.com/download/win

3. **Node.js 16+** (for React)
   - Download: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

4. **Composer** (for PHP dependencies)
   - Download: https://getcomposer.org/download/
   - Verify: `composer --version`

---

## 📥 Setup Steps

### Step 1: Clone the Repository

```bash
cd /c/xampp/htdocs
git clone https://github.com/saintechincofficial-sudo/Saint-Academia.git
cd Saint-Academia
```

### Step 2: Create Database & Import Schema

```bash
# Open MySQL via XAMPP command line or PhpMyAdmin
# Method 1: PhpMyAdmin (Easier)
# 1. Go to http://localhost/phpmyadmin
# 2. Click "New" database
# 3. Name: saint_academia
# 4. Click Create

# Method 2: MySQL CLI
"C:\xampp\mysql\bin\mysql.exe" -u root << 'EOF'
CREATE DATABASE IF NOT EXISTS saint_academia;
USE saint_academia;
SOURCE database/schema.sql;
EOF
```

### Step 3: Install Backend Dependencies

```bash
cd /c/xampp/htdocs/Saint-Academia
composer install
```

### Step 4: Setup Environment Variables

```bash
# Copy the example file
copy .env.example .env

# Verify .env contains:
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_NAME=saint_academia
# DB_USER=root
# DB_PASS=
# JWT_SECRET=saint-academia-super-secret-key-2026-change-in-production
```

### Step 5: Create Test User

```bash
# Run this in MySQL (via PhpMyAdmin SQL tab or CLI)
"C:\xampp\mysql\bin\mysql.exe" -u root saint_academia << 'EOF'
INSERT INTO users (school_id, email, password_hash, role, is_active) VALUES (
  1,
  'admin@saintacademia.com',
  '$2y$10$EEtdL80.PlXp4gN/r6sKgeQdUrj5hpGHrO1BGYRwwJeY6A/7OfoKS',
  'super_admin',
  TRUE
);
EOF
```

**Test credentials:**
- Email: `admin@saintacademia.com`
- Password: `password123`

### Step 6: Install Frontend Dependencies

```bash
cd /c/xampp/htdocs/Saint-Academia/frontend
npm install
```

### Step 7: Start Development Servers

**Terminal 1 - React Dev Server:**
```bash
cd /c/xampp/htdocs/Saint-Academia/frontend
npm run dev

# Will show:
# ➜  Local:   http://localhost:3000/
# (or 3001 if 3000 is busy)
```

**Terminal 2 - PHP Apache Server:**
```bash
# XAMPP already runs Apache on port 80
# Just make sure Apache is running in XAMPP Control Panel
# API will be at: http://localhost/Saint-Academia/api/
```

### Step 8: Test the Application

1. Open browser: **http://localhost:3000** (or the port shown)
2. You should see the **Login Page**
3. Enter credentials:
   - Email: `admin@saintacademia.com`
   - Password: `password123`
4. Click **Sign In**
5. You should be redirected to **Dashboard**

**✅ If you see the dashboard, your setup is complete!**

---

## 🧪 Testing the API (Optional)

If you want to test the API directly with curl:

```bash
# 1. Login and get token
curl -X POST http://localhost/Saint-Academia/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@saintacademia.com\",\"password\":\"password123\"}"

# Copy the token from response

# 2. Use token to access protected endpoint
curl http://localhost/Saint-Academia/api/students \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📁 Project Structure

```
Saint-Academia/
├── api/
│   ├── config/
│   │   ├── constants.php       # App constants
│   │   └── database.php        # PDO connection
│   ├── controllers/            # API controllers (StudentController, etc.)
│   ├── middleware/
│   │   ├── Auth.php           # JWT validation
│   │   └── CORSMiddleware.php # CORS headers
│   ├── models/                # Database models (BaseModel, Student.php)
│   ├── utils/
│   │   ├── JWTHandler.php    # JWT token generation/verification
│   │   └── Response.php       # JSON response formatting
│   └── routes.php             # API route definitions
│
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Auth state (login/logout)
│   │   ├── hooks/
│   │   │   ├── useAuth.js           # Auth hook
│   │   │   └── useApi.js            # API call wrapper
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        # Login form
│   │   │   └── DashboardPage.jsx    # Main dashboard
│   │   ├── App.jsx                  # Main app component
│   │   └── main.jsx                 # React entry point
│   ├── package.json
│   └── vite.config.js
│
├── database/
│   └── schema.sql              # MySQL database schema
│
├── public/
│   ├── index.php               # PHP entry point
│   └── .htaccess               # URL rewriting rules
│
├── .env                        # Environment variables (DO NOT COMMIT)
├── .env.example                # Example env file
├── composer.json               # PHP dependencies
└── .gitignore                  # Git ignore rules
```

---

## 🔐 Important Security Notes

1. **JWT_SECRET** - Change this in production!
   ```bash
   # Generate a strong secret
   # Replace the value in .env with something like:
   JWT_SECRET=your-very-long-random-secret-key-here-change-this
   ```

2. **Database Credentials** - Keep .env secure
   - DO NOT commit .env to Git
   - .gitignore already prevents this
   - Share credentials only through secure channels

3. **Password Hashing** - Already implemented
   - Uses bcrypt with cost 10
   - `password_hash()` and `password_verify()` built-in

4. **CORS** - Configured for development
   - Allows localhost:3000, 3001, 5173
   - Restrict to specific domains in production

---

## 🐛 Troubleshooting

### Issue: "Route not found" error
**Solution:** Check that .htaccess is in project root and mod_rewrite is enabled
```bash
# Verify .htaccess exists
cat .htaccess

# Check .htaccess content has RewriteEngine On
```

### Issue: CORS error when logging in
**Solution:** Make sure CORSMiddleware.php includes your dev port
```bash
# Check if your port (3000, 3001, 5173) is in allowed_origins
cat api/middleware/CORSMiddleware.php
```

### Issue: "Class not found" JWT error
**Solution:** Run composer install
```bash
cd /c/xampp/htdocs/Saint-Academia
composer install
```

### Issue: Cannot connect to database
**Solution:** Verify MySQL is running and credentials are correct
```bash
# Test connection
"C:\xampp\mysql\bin\mysql.exe" -u root -D saint_academia -e "SELECT 1;"

# Check .env file
cat .env
```

### Issue: npm install fails
**Solution:** Clear npm cache and try again
```bash
npm cache clean --force
npm install
```

---

## 📚 Common Commands

```bash
# Start React dev server (from frontend directory)
npm run dev

# Build React for production
npm run build

# Install PHP dependencies
composer install

# Update PHP dependencies
composer update

# Start PHP dev server (from public directory)
php -S localhost:8000

# Test API endpoint
curl http://localhost/Saint-Academia/api/health

# View Git status
git status

# Commit changes
git add .
git commit -m "Your message here"

# Pull latest changes
git pull origin main
```

---

## 🚀 What's Next After Setup

Once everyone is set up:

1. **Phase 2** - Build core modules:
   - Student Management (CRUD)
   - Staff Management (CRUD)
   - Class Management
   - Attendance System
   - Grades Entry
   - Fees Management

2. **Phase 3** - Advanced features:
   - Report card generation (Python)
   - ID card generation (Python)
   - Email/SMS notifications
   - Analytics dashboards

3. **Phase 4** - Deployment:
   - Configure production server
   - SSL certificate setup
   - Database backups
   - Performance optimization

---

## 📞 Need Help?

1. **Check Docs** - Read IMPLEMENTATION_GUIDE.md and CODE_REVIEW.md
2. **Check Logs** - Look at browser console (F12) for errors
3. **Test API** - Use curl to test endpoints directly
4. **Check Database** - Use PhpMyAdmin to verify data

---

## ✅ Setup Verification Checklist

- [ ] XAMPP installed and Apache/MySQL running
- [ ] Git cloned repository
- [ ] Database created (saint_academia)
- [ ] Schema imported (database/schema.sql)
- [ ] Composer dependencies installed
- [ ] .env file created with correct settings
- [ ] Test admin user created in database
- [ ] npm dependencies installed (frontend)
- [ ] npm run dev started React server
- [ ] Can access login page at http://localhost:3000
- [ ] Can login with admin@saintacademia.com / password123
- [ ] Can see dashboard after login
- [ ] Can test API with curl and JWT token

**Once all checkmarks are done, you're ready to code! 🎉**

---

**Version:** 2.0 | **Last Updated:** July 1, 2026 | **Status:** Production Ready ✅
