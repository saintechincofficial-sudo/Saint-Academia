-- ============================================================
-- Saint Academia - Phase 2 schema migration
-- Adds school branding and profile columns used by the school profile page
-- ============================================================

ALTER TABLE schools
    ADD COLUMN IF NOT EXISTS logo_path VARCHAR(255) NULL AFTER is_active;

ALTER TABLE schools
    ADD COLUMN IF NOT EXISTS letterhead_path VARCHAR(255) NULL AFTER logo_path;

ALTER TABLE schools
    ADD COLUMN IF NOT EXISTS motto VARCHAR(255) NULL AFTER letterhead_path;

ALTER TABLE schools
    ADD COLUMN IF NOT EXISTS po_box VARCHAR(100) NULL AFTER motto;

ALTER TABLE schools
    ADD COLUMN IF NOT EXISTS region VARCHAR(100) NULL AFTER po_box;

ALTER TABLE schools
    ADD COLUMN IF NOT EXISTS delegation VARCHAR(255) NULL AFTER region;

SELECT 'Phase 2 migration complete: school profile fields added.' AS status;
