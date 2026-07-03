import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function PromotionPage() {
  const { get, post } = useApi();

  const [classes, setClasses]     = useState([]);
  const [classId, setClassId]     = useState('');
  const [preview, setPreview]     = useState(null);
  const [decisions, setDecisions] = useState({});
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState('');
  const [error, setError]         = useState('');

  useEffect(() => {
    get('/classes').then(r => { if (r.success) setClasses(r.classes || []); });
  }, []);

  const loadPreview = async () => {
    if (!classId) { setError('Select a class first'); return; }
    setLoading(true); setError(''); setMessage(''); setPreview(null);
    const res = await get(`/promotions/preview?class_id=${classId}`);
    setLoading(false);
    if (res.success) {
      setPreview(res.preview);
      const init = {};
      (res.preview.students || []).forEach(s => {
        init[s.student_id] = {
          status:      s.decision    || '',
          to_class_id: s.to_class_id || '',
          to_year_id:  s.to_year_id  || '',
          notes:       s.notes       || '',
        };
      });
      setDecisions(init);
    } else {
      setError(res.message);
    }
  };

  const setDecision = (studentId, field, value) => {
    setDecisions(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const bulkDecide = (status) => {
    if (!preview) return;
    const updated = { ...decisions };
    preview.students.forEach(s => {
      updated[s.student_id] = { ...updated[s.student_id], status };
    });
    setDecisions(updated);
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true); setError(''); setMessage('');

    const decisionsArray = preview.students
      .filter(s => decisions[s.student_id]?.status)
      .map(s => ({
        student_id:  s.student_id,
        status:      decisions[s.student_id].status,
        to_class_id: decisions[s.student_id].to_class_id || null,
        to_year_id:  decisions[s.student_id].to_year_id  || null,
        annual_avg:  s.annual_avg,
        notes:       decisions[s.student_id].notes || '',
      }));

    if (!decisionsArray.length) {
      setError('No decisions set yet.');
      setSaving(false); return;
    }

    const res = await post('/promotions/apply', {
      from_class_id:         parseInt(classId),
      from_academic_year_id: parseInt(preview.academic_year_id),
      decisions:             decisionsArray,
    });
    setSaving(false);
    if (res.success) { setMessage(res.message); loadPreview(); }
    else setError(res.message);
  };

  const decided    = preview ? Object.values(decisions).filter(d => d.status).length : 0;
  const total      = preview?.students?.length || 0;
  const pct        = total > 0 ? Math.round((decided / total) * 100) : 0;

  const statusColor = { promoted: '#2E9E4E', repeated: '#B8730A', withdrawn: '#c0392b' };

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>🎓 Student Promotion</h2>
        <span className="subtitle">Manual end-of-year decisions per student</span>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Select class</label>
          <select value={classId}
            onChange={e => setClassId(e.target.value)}
            className="select-input">
            <option value="">— Choose class —</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.stream || ''}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary"
          onClick={loadPreview}
          disabled={!classId || loading}>
          {loading ? 'Loading…' : '📋 Load Students'}
        </button>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error   && <div className="error-banner">{error}</div>}

      {preview && (
        <>
          <div className="promo-summary-bar">
            <div className="promo-info">
              <strong>{preview.class?.name}</strong>
              {' — '}
              {preview.academic_year?.label}
              {' — '}
              {decided}/{total} decisions made
            </div>
            <div className="promo-bulk-actions">
              <span style={{ fontSize: 13, color: '#666', marginRight: 8 }}>
                Bulk set all:
              </span>
              <button className="btn-secondary"
                onClick={() => bulkDecide('promoted')}>
                ✅ All Promoted
              </button>
              <button className="btn-secondary"
                onClick={() => bulkDecide('repeated')}>
                🔁 All Repeated
              </button>
            </div>
          </div>

          <div className="promo-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Reg. Number</th>
                  <th>Name</th>
                  <th>Annual Avg</th>
                  <th>Decision</th>
                  <th>Next Class</th>
                  <th>Next Year</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {preview.students.map((s, i) => {
                  const d = decisions[s.student_id] || {};
                  const rowBg = d.status === 'promoted'  ? '#eafaea'
                              : d.status === 'repeated'  ? '#FDF2D0'
                              : d.status === 'withdrawn' ? '#fdecea'
                              : '';
                  return (
                    <tr key={s.student_id} style={{ background: rowBg }}>
                      <td>{i + 1}</td>
                      <td style={{ fontSize: 12 }}>{s.student_number}</td>
                      <td>
                        <strong>{s.last_name}</strong> {s.first_name}
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 'bold',
                          color: s.annual_avg === null ? '#999'
                               : s.annual_avg >= 10  ? '#2E9E4E'
                               : '#c0392b'
                        }}>
                          {s.annual_avg !== null ? `${s.annual_avg}/20` : '—'}
                        </span>
                      </td>
                      <td>
                        <select className="select-input"
                          style={{
                            minWidth: 140, fontSize: 13,
                            color: d.status ? statusColor[d.status] : '',
                          }}
                          value={d.status || ''}
                          onChange={e => setDecision(s.student_id, 'status', e.target.value)}>
                          <option value="">— Decide —</option>
                          <option value="promoted">✅ Promoted</option>
                          <option value="repeated">🔁 Repeated</option>
                          <option value="withdrawn">❌ Withdrawn</option>
                        </select>
                      </td>
                      <td>
                        {d.status && d.status !== 'withdrawn' ? (
                          <select className="select-input"
                            style={{ minWidth: 160, fontSize: 12 }}
                            value={d.to_class_id || ''}
                            onChange={e => setDecision(s.student_id, 'to_class_id', e.target.value)}>
                            <option value="">— Select class —</option>
                            {(preview.available_classes || []).map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.year_label})
                              </option>
                            ))}
                          </select>
                        ) : <span style={{ color: '#bbb', fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        {d.status && d.status !== 'withdrawn' ? (
                          <select className="select-input"
                            style={{ minWidth: 130, fontSize: 12 }}
                            value={d.to_year_id || ''}
                            onChange={e => setDecision(s.student_id, 'to_year_id', e.target.value)}>
                            <option value="">— Year —</option>
                            {(preview.available_years || []).map(y => (
                              <option key={y.id} value={y.id}>
                                {y.label}{y.is_current ? ' ✓' : ''}
                              </option>
                            ))}
                          </select>
                        ) : <span style={{ color: '#bbb', fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        <input type="text"
                          placeholder="Optional note…"
                          style={{
                            width: 130, padding: '4px 6px', fontSize: 12,
                            border: '1px solid #ddd', borderRadius: 4,
                          }}
                          value={d.notes || ''}
                          onChange={e => setDecision(s.student_id, 'notes', e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="promo-save-bar">
            <div className="promo-progress">
              <div style={{ fontSize: 13, color: '#555' }}>
                {decided} of {total} students decided ({pct}%)
                {decided === total && total > 0 && (
                  <span style={{ color: '#2E9E4E', marginLeft: 8 }}>
                    ✅ All done
                  </span>
                )}
              </div>
              <div className="promo-progress-bar">
                <div className="promo-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <button className="btn-primary btn-large"
              onClick={handleSave}
              disabled={saving || decided === 0}>
              {saving ? 'Saving…' : `💾 Save ${decided} decision(s)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
