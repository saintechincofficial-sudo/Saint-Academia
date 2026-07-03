-- ============================================================
-- Promotion records table
-- Run in phpMyAdmin against saint_academia database
-- ============================================================
USE saint_academia;

CREATE TABLE IF NOT EXISTS promotion_records (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    school_id             INT NOT NULL,
    student_id            INT NOT NULL,
    from_class_id         INT NOT NULL,
    from_academic_year_id INT NOT NULL,
    to_class_id           INT DEFAULT NULL,
    to_academic_year_id   INT DEFAULT NULL,
    status                VARCHAR(20) NOT NULL,
    annual_average        DECIMAL(5,2) DEFAULT NULL,
    notes                 TEXT DEFAULT NULL,
    decided_by            INT DEFAULT NULL,
    decided_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (school_id)             REFERENCES schools(id)        ON DELETE CASCADE,
    FOREIGN KEY (student_id)            REFERENCES students(id)       ON DELETE CASCADE,
    FOREIGN KEY (from_class_id)         REFERENCES classes(id),
    FOREIGN KEY (from_academic_year_id) REFERENCES academic_years(id),
    FOREIGN KEY (to_class_id)           REFERENCES classes(id),
    FOREIGN KEY (to_academic_year_id)   REFERENCES academic_years(id),

    UNIQUE KEY uq_promotion (school_id, student_id, from_class_id, from_academic_year_id)
);

SELECT 'Promotion records table created.' AS status;
