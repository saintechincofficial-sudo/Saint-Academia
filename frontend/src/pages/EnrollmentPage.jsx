import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function EnrollmentPage() {
  const { get, post, del } = useApi();
  const [classes, setClasses]         = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [enrolled, setEnrolled]       = useState([]);
  const [available, setAvailable]     = useState([]);
  const [selected, setSelected]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [message, setMessage]         = useState('');
  const [error, setError]             = useState('');

  useEffect(() => {
    get('/classes').then(res => {
      if (res.success) setClasses(res.classes || []);
    });
  }, []);

  const loadClass = async (classId) => {
    setSelectedClass(classId);
    setMessage('');
    setError('');
    if (!classId) return;
    setLoading(true);
    const [enrolledRes, availableRes] = await Promise.all([
      get(`/enrollments?class_id=${classId}`),
      get(`/enrollments/unenrolled?class_id=${classId}`),
    ]);
    if (enrolledRes.success)  setEnrolled(enrolledRes.enrollments || []);
    if (availableRes.success) setAvailable(availableRes.students || []);
    setSelected([]);
    setLoading(false);
  };

  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleEnroll = async () => {
    if (!selected.length) return;
    setSaving(true);
    const res = await post('/enrollments', {
      class_id: parseInt(selectedClass),
      student_ids: selected,
    });
    setSaving(false);
    if (res.success) {
      setMessage(res.message);
      setSelected([]);
      loadClass(selectedClass);
    } else {
      setError(res.message);
    }
  };

  const handleUnenroll = async (enrollmentId, name) => {
    if (!window.confirm(`Remove ${name} from this class?`)) return;
    const res = await del(`/enrollments/${enrollmentId}`);
    if (res.success) loadClass(selectedClass);
    else setError(res.message);
  };

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>📋 Class Enrollment</h2>
      </div>

      <div className="form-group" style={{ maxWidth: 360, marginBottom: 24 }}>
        <label><strong>Select a class to manage enrollment</strong></label>
        <select value={selectedClass}
          onChange={e => loadClass(e.target.value)}
          className="select-input">
          <option value="">— Choose class —</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error   && <div className="error-banner">{error}</div>}

      {loading && <p className="loading-text">Loading class data…</p>}

      {selectedClass && !loading && (
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
                            onClick={() => handleUnenroll(
                              e.id, `${e.first_name} ${e.last_name}`
                            )}>✕</button>
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
                        onChange={e =>
                          setSelected(e.target.checked ? available.map(s => s.id) : [])
                        } />
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
