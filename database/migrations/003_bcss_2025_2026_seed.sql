-- ============================================================
-- BCSS Form 1 - Academic Year 2025/2026 - Seed Data
-- Baptist Comprehensive Secondary School, Kumba
-- Run in phpMyAdmin against saint_academia database
-- ============================================================

USE saint_academia;

-- ── Step 1: Get school ID ────────────────────────────────────
SELECT @school_id := id FROM schools WHERE name LIKE '%Baptist%' OR name LIKE '%BCSS%' LIMIT 1;
SELECT CONCAT('School ID: ', IFNULL(@school_id, 'NOT FOUND - update school name first')) AS info;

-- ── Step 2: Academic Year 2025/2026 ─────────────────────────
INSERT IGNORE INTO academic_years (school_id, label, start_date, end_date, is_current)
VALUES (@school_id, '2025/2026', '2025-09-01', '2026-07-31', 1);

SELECT @year_id := id FROM academic_years WHERE school_id = @school_id AND label = '2025/2026';

-- ── Step 3: Terms ────────────────────────────────────────────
INSERT IGNORE INTO terms (academic_year_id, term_number, label, start_date, end_date, is_current)
VALUES
  (@year_id, 1, 'First Term',  '2025-09-08', '2025-12-19', 0),
  (@year_id, 2, 'Second Term', '2026-01-12', '2026-04-03', 0),
  (@year_id, 3, 'Third Term',  '2026-04-20', '2026-07-17', 1);

SELECT @term1_id := id FROM terms WHERE academic_year_id=@year_id AND term_number=1;
SELECT @term2_id := id FROM terms WHERE academic_year_id=@year_id AND term_number=2;
SELECT @term3_id := id FROM terms WHERE academic_year_id=@year_id AND term_number=3;

-- ── Step 4: Subjects (18 subjects, TC = 50) ─────────────────
INSERT IGNORE INTO subjects (school_id, name, name_fr, code, coefficient) VALUES
  (@school_id, 'Literature in English',       'Litterature Anglaise',        'LIT',   3),
  (@school_id, 'English Language',            'Langue Anglaise',             'ENG',   5),
  (@school_id, 'Citizenship Education',       'Education a la Citoyennete',  'CITZ',  2),
  (@school_id, 'History',                     'Histoire',                    'HIST',  2),
  (@school_id, 'Religious Studies',           'Etudes Religieuses',          'RS',    2),
  (@school_id, 'French Language',             'Langue Francaise',            'FRE',   5),
  (@school_id, 'Geography',                   'Geographie',                  'GEO',   3),
  (@school_id, 'Food and Nutrition',          'Alimentation et Nutrition',   'FN',    2),
  (@school_id, 'Mathematics',                 'Mathematiques',               'MATH',  5),
  (@school_id, 'Chemistry',                   'Chimie',                      'CHEM',  3),
  (@school_id, 'Biology',                     'Biologie',                    'BIO',   3),
  (@school_id, 'Physics',                     'Physique',                    'PHY',   3),
  (@school_id, 'Computer Science',            'Informatique',                'COMP',  3),
  (@school_id, 'Marketing',                   'Marketing',                   'MKT',   2),
  (@school_id, 'Manual Labour',               'Travaux Manuels',             'ML',    1),
  (@school_id, 'Physical Education',          'EPS',                         'PE',    1),
  (@school_id, 'Office and Admin Management', 'Gestion de Bureau',           'OAM',   2),
  (@school_id, 'Accounting',                  'Comptabilite',                'ACCTX', 3);

SELECT @s_lit   := id FROM subjects WHERE school_id=@school_id AND code='LIT';
SELECT @s_eng   := id FROM subjects WHERE school_id=@school_id AND code='ENG';
SELECT @s_citz  := id FROM subjects WHERE school_id=@school_id AND code='CITZ';
SELECT @s_hist  := id FROM subjects WHERE school_id=@school_id AND code='HIST';
SELECT @s_rs    := id FROM subjects WHERE school_id=@school_id AND code='RS';
SELECT @s_fre   := id FROM subjects WHERE school_id=@school_id AND code='FRE';
SELECT @s_geo   := id FROM subjects WHERE school_id=@school_id AND code='GEO';
SELECT @s_fn    := id FROM subjects WHERE school_id=@school_id AND code='FN';
SELECT @s_math  := id FROM subjects WHERE school_id=@school_id AND code='MATH';
SELECT @s_chem  := id FROM subjects WHERE school_id=@school_id AND code='CHEM';
SELECT @s_bio   := id FROM subjects WHERE school_id=@school_id AND code='BIO';
SELECT @s_phy   := id FROM subjects WHERE school_id=@school_id AND code='PHY';
SELECT @s_comp  := id FROM subjects WHERE school_id=@school_id AND code='COMP';
SELECT @s_mkt   := id FROM subjects WHERE school_id=@school_id AND code='MKT';
SELECT @s_ml    := id FROM subjects WHERE school_id=@school_id AND code='ML';
SELECT @s_pe    := id FROM subjects WHERE school_id=@school_id AND code='PE';
SELECT @s_oam   := id FROM subjects WHERE school_id=@school_id AND code='OAM';
SELECT @s_acctx := id FROM subjects WHERE school_id=@school_id AND code='ACCTX';

-- ── Step 5: Form 1 Class ─────────────────────────────────────
INSERT IGNORE INTO classes (school_id, academic_year_id, name, stream)
VALUES (@school_id, @year_id, 'Form 1', 'Arts and Science');

SELECT @class_id := id FROM classes WHERE school_id=@school_id AND academic_year_id=@year_id AND name='Form 1';
SELECT CONCAT('Class ID: ', @class_id) AS info;

-- ── Step 6: Students ─────────────────────────────────────────
INSERT IGNORE INTO students (school_id, student_number, first_name, last_name, gender, date_of_birth, status) VALUES
(@school_id,'BCSS054179','LENSLY KINYUY',      'SHERI',         'F', NULL,         'active'),
(@school_id,'BCSS054173','ROSE DIANE',          'NWANYEH',       'F', '2014-03-05', 'active'),
(@school_id,'BCSS054176','SAMIRA MAKUMBA',      'NDAM',          'F', '2012-09-05', 'active'),
(@school_id,'BCSS054185','DARYL-IVAN',          'YENGONG',       'M', '2014-09-17', 'active'),
(@school_id,'BCSS054213','MAX BRIGHT WASE',     'OTTE',          'F', '2011-11-17', 'active'),
(@school_id,'BCSS054186','NISSI NAIN',          'CHAH',          'F', '2013-05-13', 'active'),
(@school_id,'BCSS054217','MARIO',               'UDOH',          'M', '2011-05-10', 'active'),
(@school_id,'BCSS054207','BLESS EYOLLE LIKAKE', 'DELIGHT',       'F', NULL,         'active'),
(@school_id,'BCSS054174','PANDITA MORIKANG',    'FOKWA',         'F', '2014-03-14', 'active'),
(@school_id,'BCSS054212','JOYCE CHIMENY',       'SHIPU',         'F', NULL,         'active'),
(@school_id,'BCSS054172','BRIGHTER FOTJEOH',    'AJABAFAC',      'M', '2014-08-13', 'active'),
(@school_id,'BCSS054197','FAVOUR',              'ITOE',          'F', '2014-01-01', 'active'),
(@school_id,'BCSS054215','MARIENOEI',           'ONGUM',         'F', '2014-12-12', 'active'),
(@school_id,'BCSS054210','FOINSANGLE',          'GLORY',         'F', NULL,         'active'),
(@school_id,'BCSS054211','BRIGHT',              'MAURICE',       'F', '2011-05-29', 'active'),
(@school_id,'BCSS054191','MARIERITA ELEMA',     'BELO',          'F', NULL,         'active'),
(@school_id,'BCSS054192','OLIVET NYOH',         'TAH',           'F', '2010-03-05', 'active'),
(@school_id,'BCSS054205','SHAMA',               'ORUME',         'F', NULL,         'active'),
(@school_id,'BCSS054220','ASHLEY',              'NYINCHE',       'F', '2010-12-05', 'active'),
(@school_id,'BCSS054177','SONIA OBEN-NCHONG',   'EYONG',         'F', NULL,         'active'),
(@school_id,'BCSS054200','FAVOUR AKO',          'FLAMEONG',      'F', NULL,         'active'),
(@school_id,'BCSS054222','FAITH',               'ELAMEONG',      'F', '2010-08-04', 'active'),
(@school_id,'BCSS054204','SHAMA CHUNG',         'AKWO',          'F', NULL,         'active'),
(@school_id,'BCSS054209','RHEMA MOBIA',         'DIOM',          'F', '2014-01-01', 'active'),
(@school_id,'BCSS054180','PHANUEL EGAH',        'IJAH',          'M', NULL,         'active'),
(@school_id,'BCSS054178','NOELLA KEFENI',       'SUNGI',         'F', '2014-02-20', 'active'),
(@school_id,'BCSS054203','JEMIMAH ANAM',        'EPINGO',        'F', NULL,         'active'),
(@school_id,'BCSS054184','JEREMIAH MBOTAKE',    'NEGN',          'M', NULL,         'active'),
(@school_id,'BCSS054188','VICTORY INKUH',       'BENE',          'F', '2014-07-07', 'active'),
(@school_id,'BCSS054196','OLGA ONGIE',          'MUKETE',        'F', '2012-05-03', 'active'),
(@school_id,'BCSS054199','MARITA APHA',         'MBAWEI',        'F', '2010-11-04', 'active'),
(@school_id,'BCSS054219','ROY',                 'NDIFON',        'M', '2012-10-05', 'active'),
(@school_id,'BCSS054230','MAKA THELMA-BRIGHT',  'CHUYEH',        'F', '2015-06-06', 'active'),
(@school_id,'BCSS054231','KAWOB KWASING',        'IDRIS-SUCCESS', 'F', '2013-08-31', 'active'),
(@school_id,'BCSS054232','GRACIOUS',             'TEKECH',        'F', '2014-01-01', 'active'),
(@school_id,'BCSS054233','YVELTE REGINA',        'AMBONGGAH',     'F', '2010-11-10', 'active'),
(@school_id,'BCSS054234','MIRABLESS',            'TANYI',         'F', '2012-12-05', 'active'),
(@school_id,'BCSS054235','MELVIS',               'MNGO',          'F', '2012-02-10', 'active'),
(@school_id,'BCSS054236','CHRISTIAN',            'DIOM',          'M', '2014-01-01', 'active'),
(@school_id,'BCSS054237','BRIGET',               'MOWOH',         'F', '2009-12-27', 'active'),
(@school_id,'BCSS054238','AMBE L.',              'CHI',           'M', '2014-01-01', 'active'),
(@school_id,'BCSS054239','EMMACULATE',           'ETONGWE',       'F', '2009-05-14', 'active'),
(@school_id,'BCSS054240','NELLY',                'YENGO',         'F', '2012-11-28', 'active'),
(@school_id,'BCSS054241','MAC-PRIDE',            'MBANDA',        'M', '2011-05-17', 'active'),
(@school_id,'BCSS054242','ESTHER',               'MAH',           'F', '2014-01-01', 'active'),
(@school_id,'BCSS054243','FAVOUR',               'NJECK',         'F', '2014-01-26', 'active'),
(@school_id,'BCSS054244','STUDENT 1',            'FORM1',         'F', NULL,         'active'),
(@school_id,'BCSS054245','STUDENT 2',            'FORM1',         'F', NULL,         'active'),
(@school_id,'BCSS054246','STUDENT 3',            'FORM1',         'F', NULL,         'active'),
(@school_id,'BCSS054247','STUDENT 4',            'FORM1',         'F', NULL,         'active'),
(@school_id,'BCSS054248','STUDENT 5',            'FORM1',         'F', NULL,         'active'),
(@school_id,'BCSS054249','STUDENT 6',            'FORM1',         'F', NULL,         'active');

-- ── Step 7: Enroll all in Form 1 ─────────────────────────────
INSERT IGNORE INTO student_enrollments (school_id, student_id, class_id, academic_year_id, status)
SELECT @school_id, id, @class_id, @year_id, 'active'
FROM students WHERE school_id = @school_id AND student_number LIKE 'BCSS05%';

SELECT CONCAT('Setup complete. Students enrolled: ', (
  SELECT COUNT(*) FROM student_enrollments
  WHERE school_id=@school_id AND class_id=@class_id AND academic_year_id=@year_id
)) AS status;
