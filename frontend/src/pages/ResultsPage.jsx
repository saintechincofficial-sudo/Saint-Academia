import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';

function grade(score) {
  if (score >= 18) return 'A+';
  if (score >= 16) return 'A';
  if (score >= 14) return 'B+';
  if (score >= 12) return 'B';
  if (score >= 10) return 'C';
  if (score >= 8)  return 'D';
  return 'F';
}

export default function ResultsPage() {
  const { get, post } = useApi();
  const { user } = useAuth();

  // Determine if user is teacher-only
  const userRoles = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
  const isTeacher = userRoles.includes('teacher') && !userRoles.includes('school_admin') && !userRoles.includes('principal');

  const [teacherWorkload, setTeacherWorkload] = useState([]); // for teacher role

  const [classes, setClasses]     = useState([]);
  const [terms, setTerms]         = useState([]);
  const [subjects, setSubjects]   = useState([]);
  const [students, setStudents]   = useState([]);
  const [marks, setMarks]         = useState({});

  const [yearId,  setYearId]      = useState('');
  const [years,   setYears]       = useState([]);
  const [classId, setClassId]     = useState('');
  const [termId, setTermId]       = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [sequence, setSequence]   = useState('');
  const [examType, setExamType]   = useState('Term');

  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState('');
  const [error, setError]         = useState('');

  useEffect(() => {
    get('/classes').then(r => {
      if (!r.success) return;
      const all = r.classes || [];
      setClasses(all);
      const seen = new Set(); const uy = [];
      all.forEach(c => {
        const id = c.academic_year_id || c.year_id;
        if (id && !seen.has(id)) { seen.add(id); uy.push({ id, label: c.academic_year }); }
      });
      setYears(uy);
    });
    get('/terms').then(r    => { if (r.success)  setTerms(r.terms       || []); });
    get('/subjects').then(r => { if (r.success)  setSubjects(r.subjects || []); });
  }, []);

  // Load enrolled students when class changes
  useEffect(() => {
    if (!classId) { setStudents([]); setMarks({}); return; }
    setLoading(true);
    get(`/enrollments?class_id=${classId}`).then(res => {
      if (res.success) {
        const list = res.enrollments || [];
        setStudents(list);
        const init = {};
        list.forEach(e => { init[e.student_id] = ''; });
        setMarks(init);
      }
      setLoading(false);
    });
  }, [classId]);

  // Load existing marks when all filters are set
  useEffect(() => {
    if (!classId || !termId || !subjectId) return;
    const params = new URLSearchParams({
      class_id: classId, term_id: termId, sequence: sequence || ''
    });
    get(`/results?${params}`).then(res => {
      if (!res.success) return;
      const existing = {};
      (res.results || []).forEach(r => {
        if (String(r.subject_id) === String(subjectId)) {
          existing[r.student_id] = r.score;
        }
      });
      setMarks(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(sid => {
          next[sid] = existing[sid] !== undefined ? existing[sid] : '';
        });
        return next;
      });
    });
  }, [classId, termId, subjectId, sequence]);

  const handleSave = async () => {
    if (!classId || !termId || !subjectId) {
      setError('Please select class, term and subject before saving');
      return;
    }

    const marksArray = students
      .map(e => ({ student_id: e.student_id, score: marks[e.student_id] }))
      .filter(m => m.score !== '' && m.score !== undefined && m.score !== null);

    if (!marksArray.length) {
      setError('No marks entered yet');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const res = await post('/bulk-results', {
      class_id:   parseInt(classId),
      term_id:    parseInt(termId),
      subject_id: parseInt(subjectId),
      sequence:   sequence ? parseInt(sequence) : null,
      exam_type:  examType,
      marks:      marksArray,
    });

    setSaving(false);
    if (res.success) setMessage(res.message);
    else setError(res.message);
  };

  const selectedSubject = subjects.find(s => String(s.id) === String(subjectId));
  const selectedClass   = classes.find(c => String(c.id) === String(classId));

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>✏️ Results Entry</h2>
        <span className="subtitle">Enter marks for a class — scores out of 20</span>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Academic Year</label>
          <select value={yearId}
            onChange={e => { setYearId(e.target.value); setClassId(''); setSubjectId(''); setStudents([]); setMarks({}); }}
            className="select-input">
            <option value="">— Select year —</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Class</label>
          <select value={classId}
            onChange={e => { setClassId(e.target.value); setMessage(''); setError(''); }}
            className="select-input" disabled={!yearId}>
            <option value="">— Select class —</option>
            {(isTeacher
              ? classes.filter(c => teacherWorkload.some(a => String(a.class_id) === String(c.id)) && String(c.academic_year_id || c.year_id) === String(yearId))
              : classes.filter(c => !yearId || String(c.academic_year_id || c.year_id) === String(yearId))
            ).map(c => <option key={c.id} value={c.id}>{c.name} {c.stream||''}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Term</label>
          <select value={termId}
            onChange={e => setTermId(e.target.value)}
            className="select-input">
            <option value="">— Select term —</option>
            {terms.map(t => (
              <option key={t.id} value={t.id}>
                {t.label || `Term ${t.term_number}`}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Subject</label>
          <select value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            className="select-input">
            <option value="">— Select subject —</option>
            {(isTeacher
              ? subjects.filter(s => teacherWorkload.some(a =>
                  String(a.subject_id) === String(s.id) && String(a.class_id) === String(classId)
                ))
              : subjects
            ).map(s => (
              <option key={s.id} value={s.id}>
                {s.name} (×{s.coefficient})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Assessment type</label>
          <select value={examType}
            onChange={e => setExamType(e.target.value)}
            className="select-input">
            <option value="Term">Term Mark</option>
            <option value="Sequence 1">Sequence 1</option>
            <option value="Sequence 2">Sequence 2</option>
            <option value="Sequence 3">Sequence 3</option>
            <option value="Sequence 4">Sequence 4</option>
            <option value="Sequence 5">Sequence 5</option>
            <option value="Sequence 6">Sequence 6</option>
            <option value="SE1">Situation d'Evaluation 1</option>
            <option value="SE2">Situation d'Evaluation 2</option>
            <option value="SE3">Situation d'Evaluation 3</option>
          </select>
        </div>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error   && <div className="error-banner">{error}</div>}

      {classId && termId && subjectId && (
        <div className="entry-header">
          <strong>{selectedClass?.name}</strong>
          {' — '}
          <strong>{selectedSubject?.name}</strong>
          {selectedSubject?.name_fr ? ` / ${selectedSubject.name_fr}` : ''}
          {' — '}
          <strong>{examType}</strong>
          {' — Coefficient '}
          <strong>×{selectedSubject?.coefficient}</strong>
          {' — scores out of '}
          <strong>20</strong>
        </div>
      )}

      {loading
        ? <p className="loading-text">Loading students…</p>
        : students.length > 0
        ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Reg. Number</th>
                  <th>Name</th>
                  <th>Score /20</th>
                  <th>Points (×{selectedSubject?.coefficient || '?'})</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {students.map((e, i) => {
                  const raw    = marks[e.student_id];
                  const score  = raw !== '' && raw !== undefined ? parseFloat(raw) : null;
                  const coef   = parseInt(selectedSubject?.coefficient) || 1;
                  const points = score !== null && !isNaN(score)
                    ? (score * coef).toFixed(2) : '—';
                  const g      = score !== null && !isNaN(score) ? grade(score) : '—';

                  return (
                    <tr key={e.student_id}>
                      <td>{i + 1}</td>
                      <td>{e.student_number}</td>
                      <td><strong>{e.last_name}</strong> {e.first_name}</td>
                      <td>
                        <input
                          type="number"
                          min="0" max="20" step="0.25"
                          className="mark-input"
                          value={marks[e.student_id] ?? ''}
                          onChange={ev =>
                            setMarks(prev => ({ ...prev, [e.student_id]: ev.target.value }))
                          }
                          placeholder="—"
                        />
                      </td>
                      <td className="points-cell">{points}</td>
                      <td className={`grade-cell grade-${g}`}>{g}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="btn-primary btn-large"
                onClick={handleSave}
                disabled={saving || !termId || !subjectId}>
                {saving ? 'Saving…' : `💾 Save marks for ${students.length} students`}
              </button>
            </div>
          </>
        )
        : classId
        ? (
          <div className="empty-panel">
            <p>⚠️ No students enrolled in this class yet.</p>
            <p>Go to the <strong>Enrollment</strong> tab first.</p>
          </div>
        )
        : null
      }
    </div>
  );
}
