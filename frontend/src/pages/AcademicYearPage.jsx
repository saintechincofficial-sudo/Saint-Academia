import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function AcademicYearPage() {
  const { get, post, apiCall } = useApi();

  const [years,   setYears]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState('');
  const [error,   setError]   = useState('');
  const [showForm,setShowForm]= useState(false);
  const [form,    setForm]    = useState({
    label: '', start_date: '', end_date: '', is_current: 0, create_terms: true
  });

  const load = async () => {
    setLoading(true);
    const res = await get('/academic-years');
    setLoading(false);
    if (res.success) setYears(res.years || []);
    else setError(res.message);
  };

  useEffect(() => { load(); }, []);

  // Auto-fill label from start date
  const handleStartDate = (val) => {
    const d = new Date(val);
    if (!isNaN(d)) {
      const yr = d.getFullYear();
      const label = `${yr}/${yr+1}`;
      const endDate = `${yr+1}-07-31`;
      setForm(p => ({ ...p, start_date: val, label, end_date: endDate }));
    } else {
      setForm(p => ({ ...p, start_date: val }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true); setMessage(''); setError('');
    const res = await post('/academic-years', form);
    setSaving(false);
    if (res.success) {
      setMessage(res.message + (form.create_terms ? ' with 3 terms.' : '.'));
      setShowForm(false);
      setForm({ label:'', start_date:'', end_date:'', is_current:0, create_terms:true });
      load();
    } else setError(res.message);
  };

  const setCurrent = async (id) => {
    const res = await apiCall('/academic-years/set-current?id=' + id, { method:'GET' });
    if (res.success) { setMessage('Current year updated.'); load(); }
    else setError(res.message);
  };

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>Academic Years</h2>
        <button className="btn-primary" onClick={() => { setShowForm(p=>!p); setMessage(''); setError(''); }}>
          {showForm ? 'Cancel' : '+ New Academic Year'}
        </button>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error   && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="form-card">
          <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#1B2A4A' }}>Create Academic Year</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input type="date" value={form.start_date} onChange={e => handleStartDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>End Date *</label>
                <input type="date" value={form.end_date} onChange={e => setForm(p=>({...p,end_date:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label>Label *</label>
                <input value={form.label} onChange={e => setForm(p=>({...p,label:e.target.value}))} placeholder="e.g. 2026/2027" required />
              </div>
            </div>
            <div style={{ display:'flex', gap:20, margin:'12px 0 16px', fontSize:14 }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                <input type="checkbox" checked={!!form.is_current}
                  onChange={e => setForm(p=>({...p,is_current:e.target.checked?1:0}))} />
                Set as current year
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                <input type="checkbox" checked={!!form.create_terms}
                  onChange={e => setForm(p=>({...p,create_terms:e.target.checked}))} />
                Auto-create 3 terms (First, Second, Third)
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Year'}</button>
            </div>
          </form>
        </div>
      )}

      {loading && <p className="loading-text">Loading academic years...</p>}

      {years.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Terms</th>
              <th>Classes</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {years.map(y => (
              <tr key={y.id}>
                <td><strong>{y.label}</strong></td>
                <td>{y.start_date?.slice(0,10)}</td>
                <td>{y.end_date?.slice(0,10)}</td>
                <td style={{ textAlign:'center' }}>{y.term_count||0}</td>
                <td style={{ textAlign:'center' }}>{y.class_count||0}</td>
                <td>
                  {y.is_current
                    ? <span className="status-badge active">Current</span>
                    : <span className="status-badge inactive">Inactive</span>
                  }
                </td>
                <td>
                  {!y.is_current && (
                    <button className="btn-secondary" style={{ fontSize:12, padding:'5px 12px' }}
                      onClick={() => setCurrent(y.id)}>
                      Set Current
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && years.length === 0 && (
        <div className="empty-panel">
          <p>No academic years configured yet.</p>
          <p>Click <strong>+ New Academic Year</strong> to create one.</p>
        </div>
      )}
    </div>
  );
}
