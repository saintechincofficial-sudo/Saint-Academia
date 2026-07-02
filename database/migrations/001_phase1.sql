-- ============================================================
-- Saint Academia - Phase 1 schema migration
-- Run once in phpMyAdmin: open saint_academia database,
-- click the SQL tab, paste this entire file and click Go.
-- ============================================================

-- 1. Add coefficient to subjects (MINESEC subject weighting 1-10)
ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS coefficient TINYINT NOT NULL DEFAULT 1;

-- 2. Add sequence to exam_results (Sequence 1-6 Cameroonian system)
ALTER TABLE exam_results
    ADD COLUMN IF NOT EXISTS sequence TINYINT DEFAULT NULL;

-- 3. Add UNIQUE constraint to prevent duplicate result entries
ALTER TABLE exam_results
    DROP INDEX IF EXISTS uq_result_entry;

ALTER TABLE exam_results
    ADD CONSTRAINT uq_result_entry
        UNIQUE (school_id, student_id, subject_id, term_id, sequence, exam_type);

-- 4. Student enrollments table (required for Phase 2 mastersheet)
CREATE TABLE IF NOT EXISTS student_enrollments (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    school_id        INT NOT NULL,
    student_id       INT NOT NULL,
    class_id         INT NOT NULL,
    academic_year_id INT NOT NULL,
    enrolled_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status           VARCHAR(20) NOT NULL DEFAULT 'active',

    FOREIGN KEY (school_id)        REFERENCES schools(id)        ON DELETE CASCADE,
    FOREIGN KEY (student_id)       REFERENCES students(id)       ON DELETE CASCADE,
    FOREIGN KEY (class_id)         REFERENCES classes(id)        ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,

    UNIQUE KEY uq_enrollment (school_id, student_id, class_id, academic_year_id)
);

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_class_year
    ON student_enrollments (class_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_exam_results_class_term
    ON exam_results (class_id, term_id, sequence);

CREATE INDEX IF NOT EXISTS idx_attendance_class_date
    ON attendance_sessions (class_id, session_date);

SELECT 'Phase 1 migration complete.' AS status;
