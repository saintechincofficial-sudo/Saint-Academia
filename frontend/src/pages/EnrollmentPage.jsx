import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function EnrollmentPage() {
  const { get, post, del } = useApi();
  const [classes,   setClasses]   = useState([]);
  const [years,     setYears]     = useState([]);
  const [yearId,    setYearId]    = useState('');
  const [classId,   setClassId]   = useState('');
  const [enrolled,  setEnrolled]  = useState([]);
  const [available, setAvailable] = useState([]);
  const [selected,  setSelected]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [message,   setMessage]   = useState('');
  const [error,     setError]     = useState('');

  useEffect(() => {
    get('/classes').then(res => {
      if (!res.success) return;
      const all = res.classes || [];
      setClasses(all);
      const seen = new Set();
      const uy = [];
      all.forEach(c => {
        const id = c.academic_year_id || c.year_id;
        if (id && !seen.has(id)) {
          seen.add(id);
          uy.push({ id, label: c.academic_year });
        }
      });
      setYears(uy);
    });
  }, []);

  const filteredClasses = yearId
    ? classes.filter(c => String(c.academic_year_id || c.year_id) === String(yearId))
    : [];

  const handleYearChange = e => {
    setYearId(e.target.value);
    setClassId('');
    setEnrolled([]);
    setAvailable([]);
    setMessage('');
    setError('');
  };

  const loadClass = async (cid) => {
    setClassId(cid);
    setMessage('');
    setError('');
    if (!cid) return;
    setLoading(true);
    const [enrolledRes, availableRes] = await Promise.all([
      get(`/enrollments?class_id=${cid}`),
      get(`/enrollments/unenrolled?class_id=${cid}`),
    ]);
    if (enrolledRes.success)  setEnrolled(enrolledRes.enrollments || []);
    if (availableRes.success) setAvailable(availableRes.students || []);
    setSelected([]);
    setLoading(false);
  };

  const toggleSelect = id =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleEnroll = async () => {
    if (!selected.length) return;
    setSaving(true);
    const res = await post('/enrollments', {
      class_id: parseInt(classId),
      student_ids: selected,
    });
    setSaving(false);
    if (res.success) { setMessage(res.message); setSelected([]); loadClass(classId); }
    else setError(res.message);
  };

  const handleUnenroll = async (enrollmentId, name) => {
    if (!window.confirm(`Remove ${name} from this class?`)) return;
    const res = await del(`/enrollments/${enrollmentId}`);
    if (res.success) loadClass(classId);
    else setError(res.message);
  };

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>📋 Class Enrollment</h2>
      </div>

      <div className="filter-bar" style={{ marginBottom: 24 }}>
        <div className="form-group">
          <label><strong>Academic Year</strong></label>
          <select value={yearId} onChange={handleYearChange} className="select-input">
            <option value="">— Select year —</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label><strong>Class</strong></label>
          <select value={classId}
            onChange={e => loadClass(e.target.value)}
            className="select-input"
            disabled={!yearId}>
            <option value="">— Select class —</option>
            {filteredClasses.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.stream || ''}</option>
            ))}
          </select>
        </div>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error   && <div className="error-banner">{error}</div>}
      {loading && <p className="loading-text">Loading class data…</p>}

      {classId && !loading && (
        <div className="enrollment-grid">

          <div className="enrollment-panel">
            <h3>Enrolled in this class ({enrolled.length})</h3>
            {enrolled.length === 0
              ? <p className="empty-text">No students enrolled yet.</p>
              : (
                <table className="data-table">
                  <thead>
                    <tr><th>#</th><th>Name</th><th>Number</th><th></th></tr>
                  </thead>
                  <tbody>
                    {enrolled.map((e, i) => (
                      <tr key={e.id}>
                        <td>{i + 1}</td>
                        <td>{e.last_name} {e.first_name}</td>
                        <td>{e.student_number}</td>
                        <td>
                          <button className="btn-icon danger"
                            onClick={() => handleUnenroll(e.id, `${e.first_name} ${e.last_name}`)}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>

          <div className="enrollment-panel">
            <h3>Available students ({available.length})</h3>
            {available.length === 0
              ? <p className="empty-text">All active students are already enrolled.</p>
              : (
                <>
                  <div className="select-all-row">
                    <label>
                      <input type="checkbox"
                        checked={selected.length === available.length && available.length > 0}
                        onChange={e => setSelected(e.target.checked ? available.map(s => s.id) : [])} />
                      {' '}Select all
                    </label>
                    <button className="btn-primary"
                      onClick={handleEnroll}
                      disabled={!selected.length || saving}>
                      {saving ? 'Enrolling…' : `Enroll ${selected.length || ''} selected`}
                    </button>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr><th></th><th>Name</th><th>Number</th><th>Gender</th></tr>
                    </thead>
                    <tbody>
                      {available.map(s => (
                        <tr key={s.id}
                          className={selected.includes(s.id) ? 'row-selected' : ''}
                          onClick={() => toggleSelect(s.id)}
                          style={{ cursor: 'pointer' }}>
                          <td>
                            <input type="checkbox"
                              checked={selected.includes(s.id)}
                              onChange={() => toggleSelect(s.id)}
                              onClick={e => e.stopPropagation()} />
                          </td>
                          <td>{s.last_name} {s.first_name}</td>
                          <td>{s.student_number}</td>
                          <td>{s.gender || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}
