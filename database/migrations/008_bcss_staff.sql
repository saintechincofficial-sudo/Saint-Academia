-- BCSS Staff Seed - 36 teachers
USE saint_academia;
SET @school_id := (SELECT id FROM schools WHERE name LIKE '%Baptist%' LIMIT 1);

INSERT IGNORE INTO staff (school_id, staff_number, first_name, last_name, gender, phone, role, status) VALUES
(@school_id,'NWCS19191','EDMOND','ADIAH EKANE','M','651260879','Discipline Master - Full time','active'),
(@school_id,'NWCS19291','HOSTENSIA','NGONG','F','674297077','Discipline Master - Full time','active'),
(@school_id,'NWCS19391','STEARNS E.','ANKINIMBOM','M','672669530','Teacher - Full time','active'),
(@school_id,'NWCS19491','BLESSING','WULNIGHILOLLMBOM','F','651405638','Teacher - Part time','active'),
(@school_id,'NWCS19591','ODETTE','CHIA','F','676415082','Teacher - Full time','active'),
(@school_id,'NWCS19691','MARTIN','MANGA BALINGA','M','674000068','Teacher - Part time','active'),
(@school_id,'NWCS19791','STEPHEN NKEM','AJONG','M','677779108','Teacher - Part time','active'),
(@school_id,'NWCS19891','LOVELINE','MEBOKA','F','679824936','Teacher - Part time','active'),
(@school_id,'NWCS19991','VITALIS','SAMA','M','670364035','Teacher - Part time','active'),
(@school_id,'NWCS20091','EMILINE','BONGKA','F','675709663','Teacher - Full time','active'),
(@school_id,'NWCS20191','BEATRICE','MBAH','F','675340303','Teacher - Part time','active'),
(@school_id,'NWCS20291','PATRICIA KENG','TAH','F','654072191','Teacher - Part time','active'),
(@school_id,'NWCS20391','FUWAIN','ETELINE','F','677917792','Teacher - Full time','active'),
(@school_id,'NWCS20491','NELLY','NKAMBI','F','676890674','Teacher - Part time','active'),
(@school_id,'NWCS20591','NEVILLE','LONJE','M','678416521','Teacher - Part time','active'),
(@school_id,'NWCS20691','FRITZ','MISOM','M','673917491','Teacher - Part time','active'),
(@school_id,'NWCS20791','GENEVIVE','MONNA','F','677387083','Teacher - Part time','active'),
(@school_id,'NWCS20891','DIVINE','METUGE','M','678802123','Teacher - Part time','active'),
(@school_id,'NWCS20991','LINDA','ETONGWE','F','675349604','Teacher - Part time','active'),
(@school_id,'NWCS21091','GEORGE','MBAH','M','677799042','Teacher - Part time','active'),
(@school_id,'NWCS21191','ELVIS TUTE','TUTE','M','654293407','Teacher - Part time','active'),
(@school_id,'NWCS21291','EMMANUEL','WACHE','M','677858642','Teacher - Full time','active'),
(@school_id,'NWCS21391','ELIAS N. MBAH','TEDAH','M','679721218','Bursar - Part time','active'),
(@school_id,'NWCS21791','CHRISTINA','JATO','F','682441716','Teacher - Part time','active'),
(@school_id,'NWCS55891','DELPHINE','GEMUH','F','678667780','Teacher - Part time','active'),
(@school_id,'NWCS56091','CHANTAL','PANG','F','678787870','Teacher - Part time','active'),
(@school_id,'NWCS56291','MACCEL','NGAM','M','677444770','Teacher - Full time','active'),
(@school_id,'NWCS60991','F.','NAMATA','M','620639273','Teacher - Part time','active'),
(@school_id,'NWCS61091','CHE','DOM','M','681056848','Teacher - Part time','active'),
(@school_id,'NWCS67291','N.','FESTUS','M','676594817','Teacher - Part time','active'),
(@school_id,'NWCS71391','ABDU FATAH','MUSA','M','673142001','Teacher - Part time','active'),
(@school_id,'NWCS71491','RUTH AZABALEH','FONGE','M','680304219','Teacher - Part time','active'),
(@school_id,'NWCS71591','BOBOVAH','LEONARD','M','676513832','Teacher - Part time','active'),
(@school_id,'NWCS71691','DERRICK NKWAIN','TOH','M','679406628','Teacher - Part time','active'),
(@school_id,'NWCS99001','LYNDA NINGO','NSHOM','F','','Teacher - Part time','active'),
(@school_id,'NWCS99002','DANIEL','MOKOTO','M','678676113','Teacher - Part time','active');

SELECT CONCAT('Staff inserted: ', COUNT(*)) AS status FROM staff WHERE school_id = @school_id;
