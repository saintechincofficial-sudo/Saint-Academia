# Cameroonian Secondary School Management System (SMS)
## Architecture Plan & Database Schema (PHP + MySQL + XAMPP)

---

## 1. SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│    HTML5 + React + CSS (SPA - Single Page Application)          │
│   Admin │ Teacher │ Bursar │ Principal │ Parent Portal │ Student│
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST API (JSON)
┌──────────────────────────▼──────────────────────────────────────┐
│                   API LAYER (PHP + Python)                      │
│  PHP (Apache via XAMPP)                                         │
│  ├─ Authentication & JWT Tokens                                │
│  ├─ REST Endpoints (XML/JSON responses)                        │
│  ├─ Input Validation & Role Guards                             │
│  ├─ PDF/ID Card Generation (via Python microservice)           │
│  └─ Database Query Layer (Direct MySQL via mysqli/PDO)         │
│                                                                  │
│  Python (Background tasks)                                      │
│  ├─ Report card generation (PIL, ReportLab)                    │
│  ├─ QR code generation                                         │
│  ├─ Batch ID card creation                                     │
│  └─ SMS gateway integration                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    DATA LAYER (MySQL)                           │
│              MySQL 5.7+ via XAMPP                              │
│   Core Database │ File/Photo Storage (local /uploads/)        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. USER ROLES & PERMISSIONS

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full system access, school settings, user management, database control |
| **Principal** | View all reports, academic oversight, staff records, grade approval |
| **Teacher** | Own classes, attendance marking, grades entry, student profiles |
| **HOD** | Department subjects, teacher assignments, class performance reports |
| **Bursar** | Fee management, payment records, financial reports, invoicing |
| **Parent** | Own child's profile, fees status, report cards, attendance tracking |
| **Student** | Own profile, timetable, results (read-only) |

---

## 3. MODULE MAP

```
SMS
├── 01. School Configuration
├── 02. Academic Year & Terms
├── 03. Student Registry
├── 04. Staff Management
├── 05. Class & Timetable Management
├── 06. Subjects & Curriculum (GCE O/A Level)
├── 07. Attendance
├── 08. Grades & Assessments
├── 09. Report Cards (MINESEC-compliant, bilingual)
├── 10. Fee Management
├── 11. ID Card Generator (Students & Staff)
├── 12. Communication & Notices
└── 13. Admin Dashboard & Reports
```

---

## 4. DATABASE SCHEMA (MySQL)

### 4.1 SCHOOL CONFIGURATION

```sql
CREATE TABLE schools (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  name              VARCHAR(200) NOT NULL,
  name_fr           VARCHAR(200),
  motto             TEXT,
  address           TEXT,
  region            VARCHAR(100),
  division          VARCHAR(100),
  subdivision       VARCHAR(100),
  phone             VARCHAR(20),
  email             VARCHAR(150),
  website           VARCHAR(200),
  logo_url          TEXT,
  stamp_url         TEXT,
  principal_name    VARCHAR(150),
  registration_no   VARCHAR(100) UNIQUE,
  school_type       VARCHAR(50),
  language_system   VARCHAR(20) DEFAULT 'bilingual',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE academic_years (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  label             VARCHAR(20) NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  is_current        BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  UNIQUE KEY (school_id, label)
);

CREATE TABLE terms (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  academic_year_id  INT NOT NULL,
  term_number       TINYINT NOT NULL,
  label             VARCHAR(50),
  start_date        DATE,
  end_date          DATE,
  is_current        BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);
```

### 4.2 STUDENT REGISTRY

```sql
CREATE TABLE students (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  student_number    VARCHAR(30) NOT NULL,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  date_of_birth     DATE,
  gender            VARCHAR(10),
  place_of_birth    VARCHAR(150),
  nationality       VARCHAR(100) DEFAULT 'Cameroonian',
  religion          VARCHAR(80),
  photo_url         TEXT,
  phone             VARCHAR(20),
  email             VARCHAR(150),
  status            VARCHAR(20) DEFAULT 'active',
  enrollment_date   DATE,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  UNIQUE KEY (school_id, student_number),
  INDEX idx_students_school (school_id),
  INDEX idx_students_number (student_number)
);

CREATE TABLE student_guardians (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  student_id        INT NOT NULL,
  full_name         VARCHAR(150) NOT NULL,
  relationship      VARCHAR(50),
  phone             VARCHAR(20),
  email             VARCHAR(150),
  address           TEXT,
  occupation        VARCHAR(100),
  is_primary        BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE student_enrollments (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  student_id        INT NOT NULL,
  academic_year_id  INT NOT NULL,
  class_id          INT NOT NULL,
  enrollment_date   DATE DEFAULT CURDATE(),
  status            VARCHAR(20) DEFAULT 'active',
  promoted_from     INT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (promoted_from) REFERENCES classes(id),
  UNIQUE KEY (student_id, academic_year_id),
  INDEX idx_enrollments_year (academic_year_id, class_id)
);

CREATE TABLE student_documents (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  student_id        INT NOT NULL,
  doc_type          VARCHAR(80),
  file_url          TEXT,
  uploaded_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
```

### 4.3 STAFF MANAGEMENT

```sql
CREATE TABLE departments (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  name              VARCHAR(100) NOT NULL,
  name_fr           VARCHAR(100),
  hod_id            INT,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE TABLE staff (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  staff_number      VARCHAR(30) NOT NULL,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  date_of_birth     DATE,
  gender            VARCHAR(10),
  nationality       VARCHAR(100),
  photo_url         TEXT,
  phone             VARCHAR(20),
  email             VARCHAR(150),
  address           TEXT,
  role              VARCHAR(50),
  department_id     INT,
  qualification     TEXT,
  specialization    VARCHAR(150),
  employment_type   VARCHAR(30),
  employment_date   DATE,
  status            VARCHAR(20) DEFAULT 'active',
  signature_url     TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  UNIQUE KEY (school_id, staff_number),
  INDEX idx_staff_school (school_id)
);

CREATE TABLE staff_subject_assignments (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  staff_id          INT NOT NULL,
  subject_id        INT NOT NULL,
  class_id          INT NOT NULL,
  academic_year_id  INT NOT NULL,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
);
```

### 4.4 CLASSES & TIMETABLE

```sql
CREATE TABLE class_levels (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  name              VARCHAR(50) NOT NULL,
  name_fr           VARCHAR(50),
  order_no          TINYINT,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE TABLE classes (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  level_id          INT NOT NULL,
  name              VARCHAR(80) NOT NULL,
  stream            VARCHAR(50),
  academic_year_id  INT NOT NULL,
  class_teacher_id  INT,
  room              VARCHAR(50),
  max_capacity      SMALLINT DEFAULT 60,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (level_id) REFERENCES class_levels(id),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
  FOREIGN KEY (class_teacher_id) REFERENCES staff(id)
);

CREATE TABLE subjects (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  department_id     INT NOT NULL,
  name              VARCHAR(100) NOT NULL,
  name_fr           VARCHAR(100),
  code              VARCHAR(20),
  coefficient       DECIMAL(5,2) DEFAULT 1.0,
  min_score         INT DEFAULT 0,
  max_score         INT DEFAULT 100,
  exam_type         VARCHAR(50),
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE class_subject_mappings (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  class_id          INT NOT NULL,
  subject_id        INT NOT NULL,
  is_compulsory     BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  UNIQUE KEY (class_id, subject_id)
);

CREATE TABLE timetable_slots (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  class_id          INT NOT NULL,
  subject_id        INT NOT NULL,
  staff_id          INT,
  day_of_week       VARCHAR(10),
  start_time        TIME,
  end_time          TIME,
  room              VARCHAR(50),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);
```

### 4.5 ATTENDANCE

```sql
CREATE TABLE attendance_sessions (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  class_id          INT NOT NULL,
  session_date      DATE NOT NULL,
  session_type      VARCHAR(20),
  created_by        INT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (created_by) REFERENCES staff(id),
  INDEX idx_attendance_session (class_id, session_date)
);

CREATE TABLE attendance_records (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  session_id        INT NOT NULL,
  student_id        INT NOT NULL,
  status            VARCHAR(20),
  marked_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id),
  INDEX idx_attendance_student (student_id),
  UNIQUE KEY (session_id, student_id)
);
```

### 4.6 GRADES & ASSESSMENTS

```sql
CREATE TABLE assessment_types (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  name              VARCHAR(100),
  weight            DECIMAL(5,2),
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE TABLE assessments (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  class_id          INT NOT NULL,
  subject_id        INT NOT NULL,
  assessment_type_id INT NOT NULL,
  term_id           INT NOT NULL,
  assessment_date   DATE,
  max_score         INT DEFAULT 100,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id),
  FOREIGN KEY (term_id) REFERENCES terms(id)
);

CREATE TABLE grades (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  assessment_id     INT NOT NULL,
  student_id        INT NOT NULL,
  score             DECIMAL(6,2),
  grade_letter      VARCHAR(2),
  remarks           TEXT,
  entered_by        INT,
  entered_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (entered_by) REFERENCES staff(id),
  INDEX idx_grades_assessment (assessment_id),
  INDEX idx_grades_student (student_id),
  UNIQUE KEY (assessment_id, student_id)
);

CREATE TABLE term_subject_averages (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  student_id        INT NOT NULL,
  term_id           INT NOT NULL,
  subject_id        INT NOT NULL,
  average_score     DECIMAL(6,2),
  weighted_score    DECIMAL(8,3),
  grade_letter      VARCHAR(2),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES terms(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  INDEX idx_term_averages_student (student_id, term_id),
  UNIQUE KEY (student_id, term_id, subject_id)
);

CREATE TABLE term_overall_averages (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  student_id        INT NOT NULL,
  term_id           INT NOT NULL,
  class_id          INT NOT NULL,
  overall_average   DECIMAL(6,2),
  class_rank        INT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES terms(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  UNIQUE KEY (student_id, term_id)
);
```

### 4.7 FEES & PAYMENTS

```sql
CREATE TABLE fee_structures (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  academic_year_id  INT NOT NULL,
  class_level_id    INT NOT NULL,
  tuition_fee       DECIMAL(10,2),
  examination_fee   DECIMAL(10,2),
  sports_fee        DECIMAL(10,2),
  activity_fee      DECIMAL(10,2),
  total_fee         DECIMAL(10,2),
  currency          VARCHAR(5) DEFAULT 'XAF',
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
  FOREIGN KEY (class_level_id) REFERENCES class_levels(id),
  UNIQUE KEY (academic_year_id, class_level_id)
);

CREATE TABLE fee_invoices (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  student_id        INT NOT NULL,
  academic_year_id  INT NOT NULL,
  invoice_number    VARCHAR(50) UNIQUE,
  amount_due        DECIMAL(10,2),
  amount_paid       DECIMAL(10,2) DEFAULT 0,
  balance           DECIMAL(10,2),
  invoice_date      DATE DEFAULT CURDATE(),
  due_date          DATE,
  status            VARCHAR(20) DEFAULT 'unpaid',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
  INDEX idx_invoices_student (student_id, academic_year_id)
);

CREATE TABLE fee_payments (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  invoice_id        INT NOT NULL,
  student_id        INT NOT NULL,
  amount            DECIMAL(10,2),
  payment_method    VARCHAR(50),
  transaction_ref   VARCHAR(100),
  payment_date      DATE DEFAULT CURDATE(),
  received_by       INT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES fee_invoices(id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (received_by) REFERENCES staff(id),
  INDEX idx_payments_student (student_id)
);
```

### 4.8 REPORT CARDS

```sql
CREATE TABLE report_cards (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  student_id        INT NOT NULL,
  academic_year_id  INT NOT NULL,
  term_id           INT NOT NULL,
  class_id          INT NOT NULL,
  overall_average   DECIMAL(6,2),
  class_rank        INT,
  total_subjects    INT,
  file_url          TEXT,
  generated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  generated_by      INT,
  is_published      BOOLEAN DEFAULT FALSE,
  published_at      TIMESTAMP NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
  FOREIGN KEY (term_id) REFERENCES terms(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (generated_by) REFERENCES staff(id),
  UNIQUE KEY (student_id, academic_year_id, term_id)
);
```

### 4.9 ID CARD GENERATION

```sql
CREATE TABLE id_card_templates (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  card_type         VARCHAR(20),
  template_name     VARCHAR(100),
  template_config   JSON,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE TABLE id_cards (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  card_type         VARCHAR(20),
  reference_id      INT NOT NULL,
  academic_year_id  INT NOT NULL,
  template_id       INT,
  card_number       VARCHAR(50) UNIQUE,
  qr_code_data      TEXT,
  file_url          TEXT,
  generated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  generated_by      INT,
  is_printed        BOOLEAN DEFAULT FALSE,
  printed_at        TIMESTAMP NULL,
  is_active         BOOLEAN DEFAULT TRUE,
  expiry_date       DATE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
  FOREIGN KEY (template_id) REFERENCES id_card_templates(id),
  FOREIGN KEY (generated_by) REFERENCES staff(id),
  INDEX idx_id_cards_reference (card_type, reference_id),
  INDEX idx_id_cards_year (academic_year_id)
);
```

### 4.10 COMMUNICATION & NOTICES

```sql
CREATE TABLE notices (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  title             VARCHAR(200),
  title_fr          VARCHAR(200),
  body              LONGTEXT,
  body_fr           LONGTEXT,
  audience          VARCHAR(30),
  created_by        INT NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at      TIMESTAMP NULL,
  is_published      BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

CREATE TABLE sms_logs (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  recipient_phone   VARCHAR(20),
  recipient_id      INT,
  message           TEXT,
  status            VARCHAR(20),
  sent_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_by           INT,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (sent_by) REFERENCES staff(id)
);

CREATE TABLE email_logs (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  recipient_email   VARCHAR(150),
  recipient_id      INT,
  subject           VARCHAR(200),
  body              LONGTEXT,
  status            VARCHAR(20),
  sent_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_by           INT,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (sent_by) REFERENCES staff(id)
);
```

### 4.11 AUTHENTICATION & USERS

```sql
CREATE TABLE users (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  email             VARCHAR(150) NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  role              VARCHAR(30) NOT NULL,
  reference_id      INT,
  is_active         BOOLEAN DEFAULT TRUE,
  last_login        TIMESTAMP NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  UNIQUE KEY (school_id, email),
  INDEX idx_users_role (role)
);

CREATE TABLE refresh_tokens (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  user_id           INT NOT NULL,
  token             VARCHAR(500) NOT NULL,
  expires_at        TIMESTAMP,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY (token)
);

CREATE TABLE audit_logs (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  school_id         INT NOT NULL,
  user_id           INT,
  action            VARCHAR(100),
  table_name        VARCHAR(80),
  record_id         INT,
  old_data          JSON,
  new_data          JSON,
  ip_address        VARCHAR(45),
  user_agent        TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_audit_school (school_id, created_at)
);
```

---

## 5. DATABASE INDEXES

```sql
-- Performance Optimization Indexes

-- Student Lookups
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_number ON students(student_number);
CREATE INDEX idx_students_email ON students(email);

-- Enrollment Queries
CREATE INDEX idx_enrollments_year ON student_enrollments(academic_year_id, class_id);
CREATE INDEX idx_enrollments_student ON student_enrollments(student_id);

-- Grades Performance
CREATE INDEX idx_grades_assessment ON grades(assessment_id);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_term_averages_student ON term_subject_averages(student_id, term_id);

-- Fee Tracking
CREATE INDEX idx_invoices_student ON fee_invoices(student_id, academic_year_id);
CREATE INDEX idx_payments_student ON fee_payments(student_id);
CREATE INDEX idx_payments_invoice ON fee_payments(invoice_id);

-- Attendance
CREATE INDEX idx_attendance_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_attendance_date ON attendance_sessions(session_date);

-- ID Cards
CREATE INDEX idx_id_cards_reference ON id_cards(card_type, reference_id);
CREATE INDEX idx_id_cards_year ON id_cards(academic_year_id);

-- User Authentication
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_school ON users(school_id);

-- Audit Trail
CREATE INDEX idx_audit_school ON audit_logs(school_id, created_at);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
```

---

## 6. PROJECT STRUCTURE (PHP + MySQL + React)

```
sms-cameroon/
│
├── public/
│   ├── index.php                 # PHP Router (API Gateway)
│   ├── uploads/                  # Student/Staff photos, documents
│   │   ├── students/
│   │   ├── staff/
│   │   ├── reports/
│   │   └── idcards/
│   └── .htaccess                 # Rewrite rules for clean URLs
│
├── api/
│   ├── config/
│   │   ├── database.php          # MySQL connection (PDO/MySQLi)
│   │   ├── constants.php         # App constants, roles, status values
│   │   └── env.php               # Environment variables (.env)
│   │
│   ├── middleware/
│   │   ├── Auth.php              # JWT validation
│   │   ├── RoleGuard.php         # Role-based access control
│   │   └── ErrorHandler.php      # Global error handling
│   │
│   ├── controllers/
│   │   ├── AuthController.php
│   │   ├── SchoolController.php
│   │   ├── StudentController.php
│   │   ├── StaffController.php
│   │   ├── ClassController.php
│   │   ├── SubjectController.php
│   │   ├── AttendanceController.php
│   │   ├── GradeController.php
│   │   ├── ReportController.php
│   │   ├── FeeController.php
│   │   ├── IDCardController.php
│   │   ├── NoticeController.php
│   │   └── DashboardController.php
│   │
│   ├── models/
│   │   ├── User.php
│   │   ├── Student.php
│   │   ├── Staff.php
│   │   ├── Class.php
│   │   ├── Grade.php
│   │   ├── Attendance.php
│   │   ├── Fee.php
│   │   └── Report.php
│   │
│   ├── utils/
│   │   ├── JWTHandler.php        # JWT creation & validation
│   │   ├── PDFGenerator.php      # Report cards & documents
│   │   ├── QRCodeGenerator.php   # QR code creation (via Python)
│   │   ├── ImageHandler.php      # Photo upload & resize
│   │   ├── Validators.php        # Input validation
│   │   ├── Response.php          # JSON response formatter
│   │   └── Logger.php            # Activity logging
│   │
│   └── routes.php                # API route definitions
│
├── python/
│   ├── requirements.txt          # Python dependencies
│   ├── generate_reports.py       # Report card generation (ReportLab)
│   ├── generate_idcards.py       # ID card generation (PIL/ReportLab)
│   ├── generate_qrcodes.py       # QR code generation
│   ├── send_sms.py               # SMS gateway integration
│   └── backup.py                 # Database backup automation
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Header, Footer, Navbar
│   │   │   ├── auth/             # Login, Register
│   │   │   ├── dashboard/        # Role-based dashboards
│   │   │   ├── students/         # Student management
│   │   │   ├── staff/            # Staff management
│   │   │   ├── grades/           # Grades entry & display
│   │   │   ├── attendance/       # Attendance marking
│   │   │   ├── fees/             # Fee management
│   │   │   ├── idcards/          # ID card generation
│   │   │   ├── reports/          # Reports & analytics
│   │   │   └── notices/          # Notices & communication
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── StudentList.jsx
│   │   │   ├── ClassManagement.jsx
│   │   │   ├── GradesEntry.jsx
│   │   │   ├── Attendance.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── FeeManagement.jsx
│   │   │   └── IDCardGeneration.jsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.js        # Authentication context
│   │   │   ├── useAPI.js         # API calls
│   │   │   └── useRole.js        # Role checking
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx   # Auth state
│   │   │   └── SchoolContext.jsx # School data
│   │   │
│   │   ├── styles/
│   │   │   └── main.css          # Global styles
│   │   │
│   │   ├── utils/
│   │   │   ├── api.js            # API client (axios/fetch)
│   │   │   ├── validators.js
│   │   │   └── formatters.js
│   │   │
│   │   ├── App.jsx
│   │   └── index.jsx
│   │
│   ├── public/
│   │   └── index.html
│   │
│   └── package.json
│
├── docs/
│   ├── API.md                    # API documentation
│   ├── SETUP.md                  # Installation guide
│   ├── DATABASE.md               # Database schema details
│   └── DEPLOYMENT.md             # Deployment guide
│
├── .env.example                  # Environment template
├── docker-compose.yml            # Optional: Docker for MySQL
├── composer.json                 # PHP dependencies (if using)
└── README.md

```

---

## 7. TECH STACK & DEPENDENCIES

### Backend (PHP)

**Core Libraries:**
- **PHP 7.4+** (via XAMPP)
- **PDO/MySQLi** (Native MySQL connection)
- **JWT Library**: `firebase/php-jwt` or `lcobucci/jwt`
- **Validation**: `respect/validation` or custom validators
- **Hashing**: `bcrypt` (built-in `password_hash()`)

**Installation (Composer):**
```bash
composer require firebase/php-jwt
composer require respect/validation
composer require phpoffice/phpword     # For Word docs if needed
```

### Frontend (React)

**Node Dependencies:**
```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "react-router-dom": "^6.0.0",
  "axios": "^1.0.0",
  "tailwindcss": "^3.0.0",
  "date-fns": "^2.29.0",
  "chart.js": "^3.9.0",
  "react-chartjs-2": "^4.0.0"
}
```

### Python (Background Tasks)

**Dependencies (requirements.txt):**
```
Flask==2.3.0
pymysql==1.0.2
Pillow==9.5.0
reportlab==4.0.0
qrcode==7.4.0
requests==2.31.0
```

### Database
- **MySQL 5.7+** (XAMPP Bundle)
- **PhpMyAdmin** (via XAMPP for GUI management)

---

## 8. API ENDPOINTS (PHP REST)

### Authentication
- `POST   /api/auth/login`          # User login
- `POST   /api/auth/logout`         # Logout
- `POST   /api/auth/refresh`        # Refresh token
- `POST   /api/auth/register`       # User registration (Admin only)

### Students
- `GET    /api/students`            # List all students
- `GET    /api/students/{id}`       # Get student details
- `POST   /api/students`            # Create student
- `PUT    /api/students/{id}`       # Update student
- `DELETE /api/students/{id}`       # Delete student

### Grades
- `GET    /api/grades/class/{classId}`     # Get class grades
- `POST   /api/grades`                     # Enter grade
- `PUT    /api/grades/{id}`                # Update grade
- `GET    /api/reports/student/{studentId}` # Student report card

### Attendance
- `GET    /api/attendance/class/{classId}/{date}` # Class attendance
- `POST   /api/attendance`                        # Mark attendance
- `GET    /api/attendance/student/{studentId}`   # Student attendance

### ID Cards
- `GET    /api/idcards/generate`      # Initiate generation
- `POST   /api/idcards/batch`         # Generate batch
- `GET    /api/idcards/student/{id}`  # Get student ID card

### Fees
- `GET    /api/fees/invoices/student/{studentId}` # Get invoices
- `GET    /api/fees/payments/student/{studentId}` # Payment history
- `POST   /api/fees/payments`                      # Record payment

### Reports
- `GET    /api/reports/academic`      # Academic reports
- `GET    /api/reports/financial`     # Financial reports
- `GET    /api/reports/attendance`    # Attendance reports

---

## 9. KEY WORKFLOWS

### Report Card Generation
1. Term ends → Principal locks grades
2. PHP queries `term_subject_averages` table
3. Computes `term_overall_averages` and class ranking
4. **Python script** generates PDF (bilingual: FR/EN)
5. Stores file path in `report_cards` table
6. React frontend displays download link to parents

### ID Card Generation
1. Admin selects batch (class/school-wide)
2. PHP fetches records from `students` or `staff` table
3. Resizes photos via ImageHandler
4. **Python script** generates QR codes & renders cards
5. Cards stored in `/uploads/idcards/` as PDF
6. Admin prints batch (8–10 cards per A4)

### Attendance Marking
1. Teacher selects class & date
2. React form sends attendance data to PHP API
3. PHP inserts into `attendance_records`
4. Query calculates attendance percentage per student
5. Report card includes attendance metrics

### Fee Management
1. Bursar creates `fee_invoices` for all students
2. Payment received → recorded in `fee_payments`
3. Invoice balance auto-updated
4. Parent portal shows fees status
5. Financial reports aggregated from `fee_payments`

---

## 10. SETUP GUIDE (XAMPP)

### 1. Install XAMPP
- Download from `https://www.apachefriends.org/`
- Install & start Apache + MySQL

### 2. Create Database
```bash
# Via PhpMyAdmin (http://localhost/phpmyadmin)
# Or via MySQL CLI:
mysql -u root
CREATE DATABASE sms_cameroon;
USE sms_cameroon;
SOURCE /path/to/schema.sql;
```

### 3. Setup PHP Backend
```bash
cd /path/to/sms-cameroon/api
# If using Composer:
composer install

# Create .env file
cp ../.env.example ../.env
# Edit .env with DB credentials
```

### 4. Configure PHP (httpd.conf or .htaccess)
```apache
# .htaccess in /public
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.php?path=$1 [QSA,L]
</IfModule>
```

### 5. Setup React Frontend
```bash
cd /path/to/sms-cameroon/frontend
npm install
npm start     # Dev server on http://localhost:3000
```

### 6. Setup Python (Background Tasks)
```bash
cd /path/to/sms-cameroon/python
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 7. Access Application
- **Frontend**: `http://localhost:3000`
- **API**: `http://localhost/sms-cameroon/api`
- **PhpMyAdmin**: `http://localhost/phpmyadmin`

---

## 11. KEY DIFFERENCES FROM ORIGINAL SCHEMA

| Aspect | Original (Node.js + PostgreSQL) | New (PHP + MySQL) |
|--------|--------------------------------|------------------|
| **IDs** | UUID (gen_random_uuid) | AUTO_INCREMENT INT |
| **Timestamps** | TIMESTAMPTZ | TIMESTAMP with ON UPDATE |
| **JSON Storage** | JSONB (PostgreSQL type) | JSON (MySQL native) |
| **Backend** | Node.js + Express | PHP + Apache (XAMPP) |
| **API Auth** | JWT (Node middleware) | JWT (PHP middleware) |
| **Image Processing** | sharp (Node) | PHP ImageMagick OR Python PIL |
| **PDF Generation** | puppeteer (Node) | Python ReportLab OR PHP TCPDF |
| **Database Connection** | Prisma ORM | PDO / MySQLi (raw queries or lightweight ORM) |
| **Async Tasks** | Node event loop | Python subprocess calls from PHP |
| **Frontend** | React + Tailwind | React + Tailwind (same, just different API) |

---

## 12. RECOMMENDED LIBRARIES & TOOLS

| Purpose | Recommendation |
|---------|---|
| PDF Generation | ReportLab (Python) or TCPDF (PHP) |
| QR Code Generation | `qrcode` (Python) or `phpqrcode` (PHP) |
| ID Card Rendering | PIL (Python) + ReportLab |
| Image Processing | PIL/Pillow (Python) + ImageMagick (PHP) |
| JWT Auth | `firebase/php-jwt` (PHP) |
| Input Validation | `respect/validation` (PHP) |
| Database | PDO/MySQLi (PHP) direct or Medoo ORM |
| Email Sending | PHPMailer or SwiftMailer |
| SMS Gateway | MTN MoMo API / Orange CM (via Python wrapper) |
| File Storage | Local `/uploads/` or S3-compatible (MinIO) |

---

## 13. SECURITY BEST PRACTICES

1. **Password Hashing**: Use PHP's `password_hash()` with bcrypt
2. **JWT Tokens**: Set short expiry (15-30 mins), use refresh tokens
3. **Input Validation**: Always validate & sanitize user input
4. **SQL Injection**: Use prepared statements (PDO/MySQLi)
5. **CORS**: Allow only trusted frontend domains
6. **HTTPS**: Required in production
7. **Environment Variables**: Never hardcode DB credentials
8. **File Uploads**: Validate file types & store outside webroot
9. **Rate Limiting**: Implement on login & sensitive endpoints
10. **Audit Logging**: Track all critical actions in `audit_logs`

---

## 14. NEXT STEPS

1. **Setup Database** → Run schema.sql in MySQL
2. **Build API Layer** → Create PHP controllers & models
3. **Build Frontend** → React components + API integration
4. **Python Scripts** → PDF/QR/ID card generation
5. **Testing** → Unit tests (PHPUnit) + E2E tests
6. **Deployment** → Move to production server (cPanel/WHM compatible)

---

**Version 2.0** — Cameroonian Secondary School SMS Stack: PHP + MySQL + React + XAMPP
